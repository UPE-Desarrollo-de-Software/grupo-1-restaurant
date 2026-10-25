<?php

use App\Models\ConfigMesa;
use App\Models\Mesa;
use App\Models\Reserva;
use App\Models\Rol;
use App\Models\Usuario;
use Database\Seeders\PermisoSeeder;
use Database\Seeders\RolSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed([PermisoSeeder::class, RolSeeder::class]);
});

/*
 * ABM de RESERVAS (rebote 3): la reserva NO es una mesa, es un HOLD
 * sobre el inventario del salón (CONFIG_MESA − pendientes solapadas),
 * con la combinación de capacidades en reserva_inventario. Cubre: alta
 * (pública y del empleado) por inventario, combinación (excedente y
 * cantidad de mesas), solape de intervalos, liberación al cancelar /
 * llegar / vencer, lead time de 2 horas, transiciones y permisos.
 *
 * OJO: helpers globales ya definidos en otros tests (tokenEmpleado,
 * conEmpleado, fijarAforo, aforoReserva, fijarConfig…) no se
 * redeclaran acá; por eso estos tienen nombres propios y funcionan
 * aunque se corra este archivo solo.
 */

/**
 * Token de un empleado del rol indicado.
 */
function tokenReserva(string $rol): string
{
    $usuario = Usuario::factory()->create([
        'rol_id' => Rol::where('nombre', $rol)->first()->id,
    ]);

    return $usuario->createToken($rol)->plainTextToken;
}

/**
 * Resetea la identidad cacheada del guard y pone el token.
 */
function empleadoReserva(TestCase $test, string $token): TestCase
{
    app('auth')->forgetGuards();

    return $test->withToken($token);
}

/**
 * Fija el aforo del lugar en la tabla CONFIG_MESA (N mesas de 1
 * cubierto: aforo N y hasta N mesas vivas).
 */
function aforoReserva(int $capacidad): void
{
    ConfigMesa::query()->delete();
    ConfigMesa::create(['cantidad' => $capacidad, 'capacidad' => 1]);
}

/**
 * Fija la composición real del salón (reemplaza todas las filas de
 * CONFIG_MESA): p. ej. [10×4, 5×2] → aforo 50 y hasta 15 mesas.
 *
 * @param  list<array{cantidad: int, capacidad: int}>  $filas
 */
function salonReserva(array $filas): void
{
    ConfigMesa::query()->delete();

    foreach ($filas as $fila) {
        ConfigMesa::create($fila);
    }
}

/**
 * Devuelve [capacidad => cantidad] del inventario de una respuesta,
 * ordenado por capacidad (ksort) para comparar sin depender del orden
 * en que la BD devuelva las filas.
 *
 * @param  array{inventario?: list<array{capacidad: int, cantidad: int}>}  $reserva
 * @return array<int, int>
 */
function inventarioDe(array $reserva): array
{
    $agrupado = [];
    foreach ($reserva['inventario'] ?? [] as $fila) {
        $agrupado[(int) $fila['capacidad']] = (int) $fila['cantidad'];
    }
    ksort($agrupado);

    return $agrupado;
}

test('la reserva publica guarda la combinacion de capacidades sin crear mesas', function () {
    salonReserva([
        ['cantidad' => 10, 'capacidad' => 4],
        ['cantidad' => 5, 'capacidad' => 2],
    ]);
    $mesaExistente = Mesa::factory()->create(['capacidad' => 4]);

    $response = $this->postJson('/api/cliente/reservas', [
        'contacto_solicitante' => '9999-8888',
        'fecha' => now()->addDays(3)->toDateString(),
        'hora' => '21:00',
        'cantPersonas' => 5,
    ])->assertStatus(201);

    $reserva = $response->json('reserva');

    // 5 personas con 10×4 y 5×2 disponibles: 4 + 2 (excedente 1).
    expect(inventarioDe($reserva))->toBe([2 => 1, 4 => 1])
        ->and($reserva['estado'])->toBe('pendiente')
        ->and($reserva['mesa_id'])->toBeNull();

    // No se crean mesas ni se marcan las existentes: la reserva es
    // solo un hold sobre el inventario.
    expect(Mesa::count())->toBe(1)
        ->and(Mesa::findOrFail($mesaExistente->id)->estado)->toBe('libre');

    // La hora se normaliza a H:i:s (formato de la columna time).
    expect(Reserva::findOrFail($reserva['id'])->hora)->toBe('21:00:00');
});

test('sin inventario suficiente para el horario responde 422 y no guarda nada', function () {
    salonReserva([['cantidad' => 1, 'capacidad' => 4]]);

    $this->postJson('/api/cliente/reservas', [
        'contacto_solicitante' => '1234-5678',
        'fecha' => now()->addDays(2)->toDateString(),
        'hora' => '21:30',
        'cantPersonas' => 6,
    ])->assertStatus(422)
        ->assertJsonPath('message', 'No hay disponibilidad para 6 personas en ese horario.');

    expect(Reserva::count())->toBe(0)
        ->and(Mesa::count())->toBe(0);
});

test('las pendientes bloquean su intervalo, las de otra hora no y cancelar lo libera', function () {
    salonReserva([['cantidad' => 1, 'capacidad' => 4]]);
    $fecha = now()->addDays(3)->toDateString();
    $mzo = empleadoReserva($this, tokenReserva('Mozo'));

    $datos = [
        'contacto_solicitante' => '1111-2222',
        'fecha' => $fecha,
        'cantPersonas' => 4,
    ];

    // La única mesa de 4 queda tomada en [21:00, 21:30).
    $primera = $this->postJson('/api/cliente/reservas', $datos + ['hora' => '21:00'])
        ->assertStatus(201)->json('reserva.id');

    // Misma hora → sin inventario.
    $this->postJson('/api/cliente/reservas', $datos + ['hora' => '21:00'])
        ->assertStatus(422)
        ->assertJsonPath('message', 'No hay disponibilidad para 4 personas en ese horario.');

    // 21:15 se solapa con [21:00, 21:30) → también bloqueada.
    $this->postJson('/api/cliente/reservas', $datos + ['hora' => '21:15'])
        ->assertStatus(422);

    // 21:30 arranca donde termina la anterior → entra.
    $this->postJson('/api/cliente/reservas', $datos + ['hora' => '21:30'])
        ->assertStatus(201);

    // Al cancelar, el hold de las 21:00 se libera.
    $mzo->patchJson("/api/reservas/{$primera}/cancelar")
        ->assertOk()
        ->assertJsonPath('reserva.estado', 'cancelada');

    $this->postJson('/api/cliente/reservas', $datos + ['hora' => '21:00'])
        ->assertStatus(201);
});

test('la llegada finaliza la reserva y libera el inventario', function () {
    salonReserva([['cantidad' => 1, 'capacidad' => 4]]);
    $fecha = now()->addDays(2)->toDateString();

    $reserva = $this->postJson('/api/cliente/reservas', [
        'contacto_solicitante' => '3000-1000',
        'fecha' => $fecha,
        'hora' => '21:00',
        'cantPersonas' => 4,
    ])->assertStatus(201)->json('reserva.id');

    // Mientras espera: el hold toma la única mesa de 4.
    $tomada = $this->getJson("/api/cliente/reservas/disponibilidad?fecha={$fecha}&hora=21:00")
        ->assertOk();
    expect($tomada->json('disponible'))->toBe([])
        ->and($tomada->json('aforo_disponible'))->toBe(0);

    // Llega el cliente: finalizar libera el hold y devuelve el
    // inventario que el mozo debe preparar.
    $llegada = empleadoReserva($this, tokenReserva('Mozo'))
        ->patchJson("/api/reservas/{$reserva}/finalizar")
        ->assertOk()
        ->assertJsonPath('mensaje', 'Llegada registrada: reserva finalizada e inventario liberado')
        ->assertJsonPath('reserva.estado', 'finalizada');

    // El detalle sigue trayendo el inventario que había que preparar.
    expect(inventarioDe($llegada->json('reserva')))->toBe([4 => 1]);

    $libre = $this->getJson("/api/cliente/reservas/disponibilidad?fecha={$fecha}&hora=21:00")
        ->assertOk();
    expect(collect($libre->json('disponible'))->firstWhere('capacidad', 4)['cantidad'])->toBe(1);
});

test('la espera vencida pasa a no_asistio y libera el inventario', function () {
    $this->travelTo('2026-11-10 19:00:00');
    salonReserva([['cantidad' => 1, 'capacidad' => 4]]);

    $this->postJson('/api/cliente/reservas', [
        'contacto_solicitante' => '4444-3333',
        'fecha' => '2026-11-10',
        'hora' => '21:00',
        'cantPersonas' => 4,
    ])->assertStatus(201);

    // Dentro de la ventana de espera (21:00 + 30 min): sigue tomada.
    $this->travelTo('2026-11-10 21:15:00');
    $this->getJson('/api/cliente/reservas/disponibilidad?fecha=2026-11-10&hora=21:00')
        ->assertOk()
        ->assertJsonPath('disponible', []);

    // Pasó la espera: vence sola y libera el hold.
    $this->travelTo('2026-11-10 21:31:00');
    $this->getJson('/api/cliente/reservas/disponibilidad?fecha=2026-11-10&hora=21:00')
        ->assertOk();

    expect(Reserva::first()->estado)->toBe('no_asistio')
        ->and(
            collect(
                $this->getJson('/api/cliente/reservas/disponibilidad?fecha=2026-11-10&hora=21:00')
                    ->json('disponible')
            )->firstWhere('capacidad', 4)['cantidad']
        )->toBe(1);
});

test('la reserva exige 2 horas de anticipacion', function () {
    $this->travelTo('2026-11-10 19:00:00');
    aforoReserva(50);

    $datos = [
        'contacto_solicitante' => '3000-1000',
        'fecha' => '2026-11-10',
        'cantPersonas' => 2,
    ];

    // 20:30 < 21:00 (19:00 + 2h) → todavía no se puede.
    $this->postJson('/api/cliente/reservas', $datos + ['hora' => '20:30'])
        ->assertStatus(422);

    // 21:00 exacto → entra.
    $this->postJson('/api/cliente/reservas', $datos + ['hora' => '21:00'])
        ->assertStatus(201);
});

test('el empleado reserva por inventario sin indicar mesa', function () {
    $mzo = empleadoReserva($this, tokenReserva('Mozo'));

    $response = $mzo->postJson('/api/reservas', [
        'contacto_solicitante' => '5555-6666',
        'fecha' => now()->addDays(3)->toDateString(),
        'hora' => '20:00',
        'cantPersonas' => 4,
    ])->assertStatus(201);

    // Sin CONFIG_MESA cargada aplica la defensa 25×4; el empleado no
    // elige mesa: el sistema asigna la combinación.
    $reserva = $response->json('reserva');
    expect($reserva['mesa_id'])->toBeNull()
        ->and(inventarioDe($reserva))->toBe([4 => 1]);
});

test('la combinacion minimiza el excedente y la cantidad de mesas', function () {
    // 6 personas con [1×4, 3×2]: 4+2 = 6 exacto y en 2 mesas (no
    // 2+2+2, que también da 6 pero son 3 mesas).
    salonReserva([
        ['cantidad' => 1, 'capacidad' => 4],
        ['cantidad' => 3, 'capacidad' => 2],
    ]);

    $seis = $this->postJson('/api/cliente/reservas', [
        'contacto_solicitante' => '1',
        'fecha' => now()->addDays(3)->toDateString(),
        'hora' => '20:00',
        'cantPersonas' => 6,
    ])->assertStatus(201);
    expect(inventarioDe($seis->json('reserva')))->toBe([2 => 1, 4 => 1]);

    // 9 personas con [2×4, 1×2]: lo más cercano es 4+4+2 = 10
    // (excedente 1, respeta los topes por capacidad).
    salonReserva([
        ['cantidad' => 2, 'capacidad' => 4],
        ['cantidad' => 1, 'capacidad' => 2],
    ]);

    $nueve = $this->postJson('/api/cliente/reservas', [
        'contacto_solicitante' => '2',
        'fecha' => now()->addDays(3)->toDateString(),
        'hora' => '20:30',
        'cantPersonas' => 9,
    ])->assertStatus(201);
    expect(inventarioDe($nueve->json('reserva')))->toBe([2 => 1, 4 => 2]);

    // 11 > aforo (10): no hay combinación posible.
    $this->postJson('/api/cliente/reservas', [
        'contacto_solicitante' => '3',
        'fecha' => now()->addDays(3)->toDateString(),
        'hora' => '21:00',
        'cantPersonas' => 11,
    ])->assertStatus(422);
});

test('finalizar es la llegada (no exige hora) e inasistio si exige hora pasada', function () {
    $this->travelTo('2026-11-10 19:00:00');
    $futura = Reserva::factory()->create([
        'fecha' => '2026-11-10', 'hora' => '21:00:00',
    ]);
    $otra = Reserva::factory()->create([
        'fecha' => '2026-11-10', 'hora' => '21:00:00',
    ]);
    $yaFinalizada = Reserva::factory()->confirmadaFinalizada()->create();

    $mzo = empleadoReserva($this, tokenReserva('Mozo'));

    // Llegada antes de la hora: entra (el cliente vino temprano).
    $mzo->patchJson("/api/reservas/{$futura->id}/finalizar")
        ->assertOk()
        ->assertJsonPath('reserva.estado', 'finalizada');

    // La inasistencia sigue exigiendo hora pasada.
    $mzo->patchJson("/api/reservas/{$otra->id}/inasistio")
        ->assertStatus(422)
        ->assertJsonPath('message', 'Aún no llegó la hora de la reserva');

    // Pasada la hora, sí. Y solo desde 'pendiente'.
    $this->travelTo('2026-11-10 21:30:00');
    $mzo->patchJson("/api/reservas/{$otra->id}/inasistio")
        ->assertOk()
        ->assertJsonPath('reserva.estado', 'no_asistio');

    $mzo->patchJson("/api/reservas/{$futura->id}/finalizar")
        ->assertStatus(422)
        ->assertJsonPath('message', 'Solo se pueden finalizar reservas con estado pendiente');

    $mzo->patchJson("/api/reservas/{$yaFinalizada->id}/cancelar")
        ->assertStatus(422)
        ->assertJsonPath('message', 'Solo se pueden cancelar reservas con estado pendiente');
});

test('listar reservas filtra por estado y fecha', function () {
    $pendiente = Reserva::factory()->create(['fecha' => now()->addDays(3)->toDateString()]);
    Reserva::factory()->cancelada()->create();

    $mzo = empleadoReserva($this, tokenReserva('Mozo'));

    $pendientes = $mzo->getJson('/api/reservas?estado=pendiente')->assertOk();
    expect($pendientes->json())->toHaveCount(1)
        ->and($pendientes->json('0.id'))->toBe($pendiente->id);

    // El formato del filtro es Y-m-d.
    $mzo->getJson('/api/reservas?fecha=31-12-2026')
        ->assertStatus(422);

    $mzo->getJson('/api/reservas?fecha='.now()->addDays(3)->toDateString())
        ->assertOk()
        ->assertJsonCount(1);
});

test('el detalle devuelve la reserva con su inventario o 404', function () {
    $reserva = Reserva::factory()->create();
    $reserva->inventario()->create(['capacidad' => 4, 'cantidad' => 2]);
    $mzo = empleadoReserva($this, tokenReserva('Mozo'));

    $mzo->getJson("/api/reservas/{$reserva->id}")
        ->assertOk()
        ->assertJsonPath('id', $reserva->id)
        ->assertJsonPath('mesa', null)
        ->assertJsonPath('inventario.0.capacidad', 4)
        ->assertJsonPath('inventario.0.cantidad', 2);

    $mzo->getJson('/api/reservas/999')->assertNotFound();
});

test('las rutas de reservas exigen el permiso gestionar_reservas', function () {
    // Sin token → 401.
    $this->getJson('/api/reservas')->assertUnauthorized();

    // Cocina no tiene el permiso → 403.
    empleadoReserva($this, tokenReserva('Cocina'))
        ->getJson('/api/reservas')
        ->assertForbidden();

    // Mozo y Gerente sí lo tienen → llegan al controller.
    empleadoReserva($this, tokenReserva('Mozo'))
        ->getJson('/api/reservas')
        ->assertOk()
        ->assertJsonPath('message', 'No se encontraron reservas');

    empleadoReserva($this, tokenReserva('Gerente'))
        ->getJson('/api/reservas')
        ->assertOk();
});

test('eliminar la mesa cancela sus reservas pendientes y lo informa', function () {
    $mesa = Mesa::factory()->create();
    $pendiente = Reserva::factory()->create(['mesa_id' => $mesa->id]);
    $yaCancelada = Reserva::factory()->cancelada()->create(['mesa_id' => $mesa->id]);

    empleadoReserva($this, tokenReserva('Gerente'))
        ->deleteJson("/api/mesas/{$mesa->id}")
        ->assertOk()
        ->assertJsonPath('reservas_canceladas', 1);

    expect(Reserva::findOrFail($pendiente->id)->estado)->toBe('cancelada')
        ->and(Reserva::findOrFail($yaCancelada->id)->estado)->toBe('cancelada');
});

test('la disponibilidad publica muestra las capacidades libres y no expone credenciales', function () {
    salonReserva([
        ['cantidad' => 2, 'capacidad' => 4],
        ['cantidad' => 1, 'capacidad' => 2],
    ]);
    $fecha = now()->addDays(2)->toDateString();

    $disponibilidad = $this->getJson("/api/cliente/reservas/disponibilidad?fecha={$fecha}&hora=21:00")
        ->assertOk();

    // Ventana de 30 min desde la hora pedida + lo que queda libre.
    expect($disponibilidad->json('fecha'))->toBe($fecha)
        ->and($disponibilidad->json('inicio'))->toBe('21:00')
        ->and($disponibilidad->json('fin'))->toBe('21:30')
        ->and($disponibilidad->json('aforo_disponible'))->toBe(10)
        ->and(collect($disponibilidad->json('disponible'))->firstWhere('capacidad', 4)['cantidad'])->toBe(2)
        ->and(collect($disponibilidad->json('disponible'))->firstWhere('capacidad', 2)['cantidad'])->toBe(1);

    // Ruta pública: jamás expone credenciales (ni codigo_acceso).
    expect($disponibilidad->json())->not->toHaveKey('codigo_acceso');

    // Parámetros obligatorios y con formato.
    $this->getJson('/api/cliente/reservas/disponibilidad')
        ->assertStatus(422)
        ->assertJsonValidationErrors(['fecha', 'hora']);

    $this->getJson("/api/cliente/reservas/disponibilidad?fecha={$fecha}&hora=25:99")
        ->assertStatus(422)
        ->assertJsonValidationErrors(['hora']);
});

test('el cliente cancela todas las pendientes de su mesa con el codigo', function () {
    $this->travelTo('2026-11-10 19:00:00');
    $mesa = Mesa::factory()->create(['estado' => 'reservada', 'codigo_acceso' => '4444']);
    $hoy = Reserva::factory()->create([
        'mesa_id' => $mesa->id, 'fecha' => '2026-11-10', 'hora' => '20:00:00',
    ]);
    $otroDia = Reserva::factory()->create([
        'mesa_id' => $mesa->id, 'fecha' => '2026-11-12', 'hora' => '21:00:00',
    ]);
    $yaCancelada = Reserva::factory()->cancelada()->create(['mesa_id' => $mesa->id]);

    $this->postJson('/api/cliente/reservas/cancelar', ['codigo' => '4444'])
        ->assertOk()
        ->assertJsonPath('mensaje', 'Reservas canceladas correctamente')
        ->assertJsonCount(2, 'reservas');

    // Cancela las pendientes de cualquier fecha; la ya cancelada no se toca.
    expect(Reserva::findOrFail($hoy->id)->estado)->toBe('cancelada')
        ->and(Reserva::findOrFail($otroDia->id)->estado)->toBe('cancelada')
        ->and(Reserva::findOrFail($yaCancelada->id)->estado)->toBe('cancelada')
        // Hoy era la única pendiente de HOY: al cerrarla la mesa vuelve a libre.
        ->and(Mesa::findOrFail($mesa->id)->estado)->toBe('libre');
});

test('cancelar con codigo inexistente o sin pendientes responde 422 generico', function () {
    $mesa = Mesa::factory()->create(['codigo_acceso' => '1111']);

    // El código no es de ninguna mesa.
    $this->postJson('/api/cliente/reservas/cancelar', ['codigo' => '2222'])
        ->assertStatus(422)
        ->assertJsonPath('message', 'No hay reservas pendientes con ese código');

    // La mesa existe pero no tiene reservas pendientes.
    $this->postJson('/api/cliente/reservas/cancelar', ['codigo' => '1111'])
        ->assertStatus(422)
        ->assertJsonPath('message', 'No hay reservas pendientes con ese código');

    // Con solo reservas ya canceladas tampoco hace nada.
    Reserva::factory()->cancelada()->create(['mesa_id' => $mesa->id]);
    $this->postJson('/api/cliente/reservas/cancelar', ['codigo' => '1111'])
        ->assertStatus(422);

    // Destruída la mesa su código deja de valer (sus pendientes se
    // cancelaron juntas con la destrucción).
    $otra = Mesa::factory()->create(['codigo_acceso' => '3333']);
    Reserva::factory()->create(['mesa_id' => $otra->id]);
    empleadoReserva($this, tokenReserva('Gerente'))
        ->deleteJson("/api/mesas/{$otra->id}")
        ->assertOk();

    $this->postJson('/api/cliente/reservas/cancelar', ['codigo' => '3333'])
        ->assertStatus(422)
        ->assertJsonPath('message', 'No hay reservas pendientes con ese código');
});

test('el codigo de cancelacion valida el formato de 4 digitos', function () {
    // Formato viejo de 6 dígitos: la validación lo corta antes de buscar.
    $this->postJson('/api/cliente/reservas/cancelar', ['codigo' => '123456'])
        ->assertStatus(422);

    $this->postJson('/api/cliente/reservas/cancelar', [])
        ->assertStatus(422);
});
