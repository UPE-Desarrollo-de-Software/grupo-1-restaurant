<?php

use App\Models\ConfigMesa;
use App\Models\Mesa;
use App\Models\Pedido;
use App\Models\Plato;
use App\Models\Reserva;
use App\Models\Rol;
use App\Models\Usuario;
use Carbon\Carbon;
use Database\Seeders\PermisoSeeder;
use Database\Seeders\RolSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

uses(RefreshDatabase::class);

beforeEach(function () {
    // Permisos (ROL_PERMISO) y roles, como en producción.
    $this->seed([PermisoSeeder::class, RolSeeder::class]);
});

afterEach(function () {
    // Limpia el tiempo congelado (tests del margen de reservas) para
    // que no se filtre a los demás tests.
    Carbon::setTestNow();
});

/*
 * Reglas del rebote 2: mesas DINÁMICAS con aforo (CONFIG_MESA), alta
 * del mozo / baja lógica del gerente y configuración de la
 * composición del salón.
 *
 * OJO: helpers globales ya definidos en otros tests (autenticarMozo,
 * platoDePrueba, mesaVisita, platoAuto, tokenMozo, comensal…) no se
 * redeclaran acá.
 */

/**
 * Token de un empleado del rol indicado.
 */
function tokenEmpleado(string $rol): string
{
    $usuario = Usuario::factory()->create([
        'rol_id' => Rol::where('nombre', $rol)->first()->id,
    ]);

    return $usuario->createToken($rol)->plainTextToken;
}

/**
 * Resetea la identidad cacheada del guard y pone el token.
 */
function conEmpleado(TestCase $test, string $token): TestCase
{
    app('auth')->forgetGuards();

    return $test->withToken($token);
}

/**
 * Fija el aforo del lugar en la tabla CONFIG_MESA (N mesas de 1
 * cubierto: aforo N y hasta N mesas vivas).
 */
function fijarAforo(int $capacidad): void
{
    ConfigMesa::query()->delete();
    ConfigMesa::create(['cantidad' => $capacidad, 'capacidad' => 1]);
}

test('el mozo crea una mesa dinamica con su codigo de acceso', function () {
    $response = conEmpleado($this, tokenEmpleado('Mozo'))
        ->postJson('/api/mesas', ['capacidad' => 4])
        ->assertStatus(201);

    $mesa = $response->json('mesa');
    expect($mesa['estado'])->toBe('libre')
        ->and($mesa['capacidad'])->toBe(4)
        ->and($mesa['codigo_acceso'])->toMatch('/^\d{4}$/');

    // El código es único entre las mesas vivas.
    expect(Mesa::where('codigo_acceso', $mesa['codigo_acceso'])->count())->toBe(1);
});

test('crear mesa respeta el aforo del lugar', function () {
    fijarAforo(10);
    $mzo = conEmpleado($this, tokenEmpleado('Mozo'));

    $mzo->postJson('/api/mesas', ['capacidad' => 8])->assertStatus(201);

    // 8 ya ocupados: otra de 3 supera el aforo.
    $mzo->postJson('/api/mesas', ['capacidad' => 3])
        ->assertStatus(422)
        ->assertJsonPath('message', 'Se supera la capacidad del lugar: aforo 10, ocupada 8, la mesa nueva necesita 3.');

    // Hasta el tope exacto sí entra.
    $mzo->postJson('/api/mesas', ['capacidad' => 2])->assertStatus(201);
    expect(Mesa::count())->toBe(2);
});

test('el aforo efectivo descuenta las reservas que ocurren ahora', function () {
    fijarAforo(10);
    $ahora = now();

    // Hold que contiene al AHORA: [ahora, ahora + 30 min), toma 4
    // del salón (la reserva se crea directa: el lead time de la API
    // no deja reservar para "ahora").
    $reserva = Reserva::factory()->create([
        'fecha' => $ahora->toDateString(),
        'hora' => $ahora->format('H:i:s'),
        'cantPersonas' => 4,
    ]);
    $reserva->inventario()->create(['capacidad' => 4, 'cantidad' => 1]);

    // Reserva de OTRO día: no descuenta (es de mañana).
    Reserva::factory()->create(['cantPersonas' => 2])
        ->inventario()->create(['capacidad' => 2, 'cantidad' => 1]);

    // Reserva de HOY pero de otro horario (+3 h): no descuenta.
    Reserva::factory()->create([
        'fecha' => $ahora->toDateString(),
        'hora' => $ahora->copy()->addHours(3)->format('H:i:s'),
        'cantPersonas' => 3,
    ])->inventario()->create(['capacidad' => 3, 'cantidad' => 1]);

    $mzo = conEmpleado($this, tokenEmpleado('Mozo'));

    // Aforo efectivo = 10 − 4 = 6: de 0 a 6 entra.
    $mesaId = $mzo->postJson('/api/mesas', ['capacidad' => 6])
        ->assertStatus(201)
        ->json('mesa.id');

    $mzo->postJson('/api/mesas', ['capacidad' => 1])
        ->assertStatus(422)
        ->assertJsonPath(
            'message',
            'Se supera la capacidad del lugar: aforo 10, reservada 4 en este horario, ocupada 6, la mesa nueva necesita 1.'
        );

    // Editar también lo descuenta: 6 → 7 supera el efectivo (6).
    conEmpleado($this, tokenEmpleado('Gerente'))
        ->putJson("/api/mesas/{$mesaId}", ['capacidad' => 7, 'estado' => 'libre'])
        ->assertStatus(422)
        ->assertJsonPath(
            'message',
            'Se supera la capacidad del lugar: aforo 10, reservada 4 en este horario, ocupada 7 con la mesa editada.'
        );
});

test('las reservas de las proximas 60 minutos protegen el aforo de las mesas', function () {
    // Tiempo congelado a las 20:00: la ventana de protección de una
    // reserva es [hora − 60, hora + 30), sin depender de la hora real.
    Carbon::setTestNow(Carbon::parse('20:00:00'));
    $hoy = now()->toDateString();
    fijarAforo(10);

    // 20:30 (dentro del margen): toma 4 del aforo efectivo.
    $proxima = Reserva::factory()->create(['fecha' => $hoy, 'hora' => '20:30:00']);
    $proxima->inventario()->create(['capacidad' => 4, 'cantidad' => 1]);

    // 21:45 (fuera del margen: su ventana arranca recién 20:45).
    $lejana = Reserva::factory()->create(['fecha' => $hoy, 'hora' => '21:45:00']);
    $lejana->inventario()->create(['capacidad' => 3, 'cantidad' => 1]);

    $mzo = conEmpleado($this, tokenEmpleado('Mozo'));

    // Aforo efectivo = 10 − 4 = 6: crear 7 falla, 6 entra.
    $mzo->postJson('/api/mesas', ['capacidad' => 7])
        ->assertStatus(422)
        ->assertJsonPath(
            'message',
            'Se supera la capacidad del lugar: aforo 10, reservada 4 en este horario, ocupada 0, la mesa nueva necesita 7.'
        );

    $mesaId = $mzo->postJson('/api/mesas', ['capacidad' => 6])
        ->assertStatus(201)
        ->json('mesa.id');

    // Editar también respeta la reserva próxima: 6 → 7 > 6.
    conEmpleado($this, tokenEmpleado('Gerente'))
        ->putJson("/api/mesas/{$mesaId}", ['capacidad' => 7, 'estado' => 'libre'])
        ->assertStatus(422)
        ->assertJsonPath(
            'message',
            'Se supera la capacidad del lugar: aforo 10, reservada 4 en este horario, ocupada 7 con la mesa editada.'
        );
});

test('editar la capacidad tambien valida el aforo', function () {
    fijarAforo(10);
    $mzo = conEmpleado($this, tokenEmpleado('Mozo'));

    $mesaId = $mzo->postJson('/api/mesas', ['capacidad' => 6])
        ->assertStatus(201)
        ->json('mesa.id');

    $gerente = conEmpleado($this, tokenEmpleado('Gerente'));

    // 6 → 9 sigue dentro del aforo (permiso gestionar_mesas).
    conEmpleado($this, tokenEmpleado('Gerente'))
        ->putJson("/api/mesas/{$mesaId}", ['capacidad' => 9, 'estado' => 'libre'])
        ->assertStatus(200);

    $gerente->putJson("/api/mesas/{$mesaId}", ['capacidad' => 11, 'estado' => 'libre'])
        ->assertStatus(422);

    // El codigo_acceso no viaja ni se toca.
    $gerente->putJson("/api/mesas/{$mesaId}", [
        'capacidad' => 4,
        'estado' => 'libre',
        'codigo_acceso' => '999999',
    ])->assertStatus(200);
    expect(Mesa::find($mesaId)->codigo_acceso)->not->toBe('999999');
});

test('el alta es del mozo y la baja logica del gerente', function () {
    $mesaId = conEmpleado($this, tokenEmpleado('Mozo'))
        ->postJson('/api/mesas', ['capacidad' => 2])
        ->assertStatus(201)
        ->json('mesa.id');
    $codigo = Mesa::findOrFail($mesaId)->codigo_acceso;

    // Un mozo no gestiona la baja.
    conEmpleado($this, tokenEmpleado('Mozo'))
        ->deleteJson("/api/mesas/{$mesaId}")
        ->assertForbidden();

    // El gerente la destruye: borrado LÓGICO.
    conEmpleado($this, tokenEmpleado('Gerente'))
        ->deleteJson("/api/mesas/{$mesaId}")
        ->assertOk();

    expect(Mesa::find($mesaId))->toBeNull()
        ->and(Mesa::withTrashed()->find($mesaId))->not->toBeNull()
        // Para la app la mesa dejó de existir: su código no entra.
        ->and($codigo)->toMatch('/^\d{4}$/');

    $this->postJson('/api/acceso', ['codigo' => $codigo])->assertStatus(401);
});

test('los pedidos historicos sobreviven a la destruccion de la mesa', function () {
    $mzo = conEmpleado($this, tokenEmpleado('Mozo'));

    $mesaId = $mzo->postJson('/api/mesas', ['capacidad' => 4])
        ->assertStatus(201)
        ->json('mesa.id');

    $platoId = Plato::factory()->create(['precio' => 900])->id;
    $pedidoId = $mzo->postJson("/api/mesas/{$mesaId}/pedidos", [
        'platos' => [['plato_id' => $platoId, 'cantidad' => 2]],
    ])->assertStatus(201)->json('pedido.id');

    // La destrucción no borra nada del histórico.
    conEmpleado($this, tokenEmpleado('Gerente'))
        ->deleteJson("/api/mesas/{$mesaId}")
        ->assertOk();

    $pedido = Pedido::find($pedidoId);
    expect($pedido)->not->toBeNull()
        ->and($pedido->mesa_id)->toBe($mesaId)
        ->and((float) $pedido->total)->toBe(1800.0);
});

test('la configuracion expone y protege el aforo', function () {
    fijarAforo(100);

    // Cualquier empleado la lee.
    conEmpleado($this, tokenEmpleado('Mozo'))
        ->getJson('/api/configuracion')
        ->assertOk()
        ->assertJsonPath('aforo', 100)
        ->assertJsonPath('mesas_maximas', 100)
        ->assertJsonPath('config_mesas.0.cantidad', 100)
        ->assertJsonPath('config_mesas.0.capacidad', 1);

    // La edita solo quien gestiona mesas.
    conEmpleado($this, tokenEmpleado('Mozo'))
        ->putJson('/api/configuracion', [
            'config_mesas' => [['cantidad' => 50, 'capacidad' => 1]],
        ])->assertForbidden();

    // Con una mesa de capacidad 8 no se puede bajar el aforo a 5.
    $mzo = conEmpleado($this, tokenEmpleado('Mozo'));
    $mzo->postJson('/api/mesas', ['capacidad' => 8])->assertStatus(201);

    $gerente = conEmpleado($this, tokenEmpleado('Gerente'));
    $gerente->putJson('/api/configuracion', [
        'config_mesas' => [['cantidad' => 5, 'capacidad' => 1]],
    ])
        ->assertStatus(422)
        ->assertJsonPath('message', 'No se puede bajar el aforo a 5: las mesas vivas ya ocupan 8.');

    $gerente->putJson('/api/configuracion', [
        'config_mesas' => [['cantidad' => 5, 'capacidad' => 10]],
    ])->assertOk();

    $this->app['auth']->forgetGuards();
    conEmpleado($this, tokenEmpleado('Mozo'))
        ->getJson('/api/configuracion')
        ->assertOk()
        ->assertJsonPath('aforo', 50)
        ->assertJsonPath('mesas_maximas', 5);
});
