<?php

use App\Models\ConfigMesa;
use App\Models\Mesa;
use App\Models\Pedido;
use App\Models\Plato;
use App\Models\Rol;
use App\Models\Usuario;
use Database\Seeders\PermisoSeeder;
use Database\Seeders\RolSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

uses(RefreshDatabase::class);

beforeEach(function () {
    // Permisos (ROL_PERMISO) y roles, como en producción.
    $this->seed([PermisoSeeder::class, RolSeeder::class]);
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
        ->and($mesa['codigo_acceso'])->toMatch('/^\d{6}$/');

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
        ->and($codigo)->toMatch('/^\d{6}$/');

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
