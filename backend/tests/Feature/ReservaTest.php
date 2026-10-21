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
 * ABM de RESERVAS (DER v3.0): altas (pública con "mozo virtual" y del
 * empleado), lead time de 2 horas, conflicto por fecha+hora exacta,
 * transiciones de estado, liberación de la mesa, cancelación pública
 * por codigo_acceso y permisos.
 *
 * OJO: helpers globales ya definidos en otros tests (tokenEmpleado,
 * conEmpleado, fijarAforo, autenticarMozo…) no se redeclaran acá; por
 * eso estos tienen nombres propios y funcionan aunque se corra este
 * archivo solo.
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

test('el cliente publico reserva eligiendo una mesa existente', function () {
    $mesa = Mesa::factory()->create(['capacidad' => 6]);

    $response = $this->postJson('/api/cliente/reservas', [
        'mesa_id' => $mesa->id,
        'contacto_solicitante' => 'cliente@correo.com',
        'fecha' => now()->addDays(3)->toDateString(),
        'hora' => '20:00',
        'cantPersonas' => 4,
    ])->assertStatus(201);

    $reserva = $response->json('reserva');
    expect($reserva['estado'])->toBe('pendiente')
        ->and($reserva['mesa_id'])->toBe($mesa->id)
        ->and($reserva['cantPersonas'])->toBe(4);

    // La hora se normaliza a H:i:s (formato de la columna time).
    expect(Reserva::findOrFail($reserva['id'])->hora)->toBe('20:00:00');
});

test('la reserva publica sin mesa la crea el sistema como mozo virtual', function () {
    aforoReserva(50);

    $antes = Mesa::count();

    $response = $this->postJson('/api/cliente/reservas', [
        'contacto_solicitante' => '9999-8888',
        'fecha' => now()->addDays(2)->toDateString(),
        'hora' => '21:30',
        'cantPersonas' => 5,
    ])->assertStatus(201);

    // La mesa la creó el SISTEMA (aforo validado), no el cliente.
    expect(Mesa::count())->toBe($antes + 1);

    $mesa = Mesa::findOrFail($response->json('reserva.mesa_id'));
    expect($mesa->capacidad)->toBe(5)
        ->and($mesa->usuario_id)->toBeNull()
        ->and($mesa->codigo_acceso)->toMatch('/^\d{4}$/');
});

test('el mozo virtual respeta el aforo del lugar', function () {
    aforoReserva(4);

    $this->postJson('/api/cliente/reservas', [
        'contacto_solicitante' => '1234-5678',
        'fecha' => now()->addDays(2)->toDateString(),
        'hora' => '21:30',
        'cantPersonas' => 6,
    ])->assertStatus(422)
        ->assertJsonPath('message', 'Se supera la capacidad del lugar: aforo 4, ocupada 0, la mesa nueva necesita 6.');

    expect(Mesa::count())->toBe(0)
        ->and(Reserva::count())->toBe(0);
});

test('la reserva exige 2 horas de anticipacion', function () {
    $this->travelTo('2026-11-10 19:00:00');
    aforoReserva(50);
    $mesa = Mesa::factory()->create();

    $datos = [
        'mesa_id' => $mesa->id,
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

test('no se puede reservar la misma mesa en la misma fecha y hora exacta', function () {
    $mesa = Mesa::factory()->create();
    $fecha = now()->addDays(4)->toDateString();

    $datos = [
        'mesa_id' => $mesa->id,
        'contacto_solicitante' => '1111-2222',
        'fecha' => $fecha,
        'hora' => '20:00',
        'cantPersonas' => 2,
    ];

    $this->postJson('/api/cliente/reservas', $datos)->assertStatus(201);

    // Misma hora → conflicto.
    $this->postJson('/api/cliente/reservas', $datos)
        ->assertStatus(422)
        ->assertJsonPath('message', 'Hay una reserva agendada en esa misma fecha y hora');

    // Otra hora sigue permitida.
    $otra = $datos;
    $otra['hora'] = '21:00';
    $this->postJson('/api/cliente/reservas', $otra)->assertStatus(201);
});

test('la cantidad de personas no supera la capacidad de la mesa', function () {
    $mesa = Mesa::factory()->create(['capacidad' => 4]);

    $this->postJson('/api/cliente/reservas', [
        'mesa_id' => $mesa->id,
        'contacto_solicitante' => '4444-3333',
        'fecha' => now()->addDays(3)->toDateString(),
        'hora' => '20:00',
        'cantPersonas' => 7,
    ])->assertStatus(422)
        ->assertJsonPath('message', 'La cantidad de personas supera capacidad de mesa');
});

test('el empleado debe indicar la mesa y una mesa inexistente responde 404', function () {
    $mzo = empleadoReserva($this, tokenReserva('Mozo'));
    $datos = [
        'contacto_solicitante' => '5555-6666',
        'fecha' => now()->addDays(3)->toDateString(),
        'hora' => '20:00',
        'cantPersonas' => 2,
    ];

    // Sin mesa_id la validación del controller lo corta (422).
    $mzo->postJson('/api/reservas', $datos)->assertStatus(422);

    // Find estricto: el id inventado no crea nada.
    $mzo->postJson('/api/reservas', $datos + ['mesa_id' => 999])
        ->assertStatus(404)
        ->assertJsonPath('message', 'Mesa no encontrada');

    expect(Mesa::count())->toBe(0)
        ->and(Reserva::count())->toBe(0);
});

test('solo la reserva de hoy marca la mesa como reservada', function () {
    $this->travelTo('2026-11-10 19:00:00');
    aforoReserva(50);

    $hoy = $this->postJson('/api/cliente/reservas', [
        'contacto_solicitante' => '1',
        'fecha' => '2026-11-10',
        'hora' => '21:00',
        'cantPersonas' => 3,
    ])->assertStatus(201)->json('reserva.mesa_id');

    expect(Mesa::findOrFail($hoy)->estado)->toBe('reservada');

    // La de otro día no toca el estado (se consulta por fecha).
    $otra = $this->postJson('/api/cliente/reservas', [
        'contacto_solicitante' => '2',
        'fecha' => '2026-11-12',
        'hora' => '21:00',
        'cantPersonas' => 3,
    ])->assertStatus(201)->json('reserva.mesa_id');

    expect(Mesa::findOrFail($otra)->estado)->toBe('libre');
});

test('cancelar la reserva de hoy libera la mesa recien al cerrar la ultima', function () {
    $this->travelTo('2026-11-10 19:00:00');
    $mesa = Mesa::factory()->create(['estado' => 'reservada']);
    $fecha = '2026-11-10';

    $primera = Reserva::factory()->create([
        'mesa_id' => $mesa->id, 'fecha' => $fecha, 'hora' => '20:00:00',
    ]);
    $segunda = Reserva::factory()->create([
        'mesa_id' => $mesa->id, 'fecha' => $fecha, 'hora' => '21:00:00',
    ]);

    $mzo = empleadoReserva($this, tokenReserva('Mozo'));

    // Queda otra pendiente de hoy → la mesa sigue reservada.
    $mzo->patchJson("/api/reservas/{$primera->id}/cancelar")->assertOk();
    expect(Mesa::findOrFail($mesa->id)->estado)->toBe('reservada');

    // Se cierra la última → vuelve a libre.
    $mzo->patchJson("/api/reservas/{$segunda->id}/cancelar")
        ->assertOk()
        ->assertJsonPath('reserva.estado', 'cancelada');
    expect(Mesa::findOrFail($mesa->id)->estado)->toBe('libre');
});

test('finalizar e inasistir exigen pendiente y hora pasada', function () {
    $this->travelTo('2026-11-10 19:00:00');
    $futuro = Reserva::factory()->create([
        'fecha' => '2026-11-10', 'hora' => '21:00:00',
    ]);
    $yaFinalizada = Reserva::factory()->confirmadaFinalizada()->create();

    $mzo = empleadoReserva($this, tokenReserva('Mozo'));

    // Aún no llegó la hora.
    $mzo->patchJson("/api/reservas/{$futuro->id}/finalizar")
        ->assertStatus(422)
        ->assertJsonPath('message', 'Aún no llegó la hora de la reserva');
    $mzo->patchJson("/api/reservas/{$futuro->id}/inasistio")->assertStatus(422);

    // Pasada la hora, sí. Y solo desde 'pendiente'.
    $this->travelTo('2026-11-10 21:30:00');
    $mzo->patchJson("/api/reservas/{$futuro->id}/finalizar")
        ->assertOk()
        ->assertJsonPath('reserva.estado', 'finalizada');

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

test('el detalle devuelve la reserva con su mesa o 404', function () {
    $reserva = Reserva::factory()->create();
    $mzo = empleadoReserva($this, tokenReserva('Mozo'));

    $mzo->getJson("/api/reservas/{$reserva->id}")
        ->assertOk()
        ->assertJsonPath('id', $reserva->id)
        ->assertJsonPath('mesa.id', $reserva->mesa_id);

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

test('el mapa publico de mesas no expone los codigos de acceso', function () {
    Mesa::factory()->create(['capacidad' => 2]);
    Mesa::factory()->create(['capacidad' => 4]);

    $mesas = $this->getJson('/api/cliente/reservas/mesas')->assertOk()->json();

    expect($mesas)->toHaveCount(2)
        ->and($mesas[0])->toHaveKeys(['id', 'capacidad', 'estado'])
        ->and($mesas[0])->not->toHaveKey('codigo_acceso');
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
