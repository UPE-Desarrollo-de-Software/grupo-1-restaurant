<?php

use App\Models\ConfigMesa;
use App\Models\Rol;
use App\Models\Usuario;
use Database\Seeders\ConfigMesaSeeder;
use Database\Seeders\PermisoSeeder;
use Database\Seeders\RolSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed([PermisoSeeder::class, RolSeeder::class]);
});

/*
 * CONFIG_MESA: composición del salón (cantidad × capacidad). El
 * AFORO = Σ(capacidad × cantidad) y el TOPE de mesas = Σ cantidad;
 * ambos límites los valida MesaService al crear mesas y
 * ConfiguracionService al editar (PUT /api/configuracion replace-all).
 *
 * OJO: helpers globales ya definidos en otros tests (tokenEmpleado,
 * conEmpleado, fijarAforo, aforoReserva…) no se redeclaran acá.
 */

/**
 * Token de un empleado del rol indicado.
 */
function tokenConfig(string $rol): string
{
    $usuario = Usuario::factory()->create([
        'rol_id' => Rol::where('nombre', $rol)->first()->id,
    ]);

    return $usuario->createToken($rol)->plainTextToken;
}

/**
 * Resetea la identidad cacheada del guard y pone el token.
 */
function conConfig(TestCase $test, string $token): TestCase
{
    app('auth')->forgetGuards();

    return $test->withToken($token);
}

/**
 * Fija la composición CONFIG_MESA (replace-all de filas).
 *
 * @param  list<array{cantidad: int, capacidad: int}>  $filas
 */
function fijarConfig(array $filas): void
{
    ConfigMesa::query()->delete();

    foreach ($filas as $fila) {
        ConfigMesa::create($fila);
    }
}

test('con la tabla vacia la configuracion responde con la defensa 100/25', function () {
    conConfig($this, tokenConfig('Mozo'))
        ->getJson('/api/configuracion')
        ->assertOk()
        ->assertJsonPath('config_mesas', [])
        ->assertJsonPath('aforo', 100)
        ->assertJsonPath('mesas_maximas', 25);
});

test('el seeder base deja 25 mesas de 4 (aforo 100)', function () {
    $this->seed(ConfigMesaSeeder::class);

    expect(ConfigMesa::count())->toBe(1)
        ->and(ConfigMesa::first()->cantidad)->toBe(25)
        ->and(ConfigMesa::first()->capacidad)->toBe(4);

    conConfig($this, tokenConfig('Mozo'))
        ->getJson('/api/configuracion')
        ->assertOk()
        ->assertJsonPath('aforo', 100)
        ->assertJsonPath('mesas_maximas', 25);
});

test('el gerente reemplaza la composicion completa replace-all', function () {
    fijarConfig([
        ['cantidad' => 2, 'capacidad' => 4],
    ]);

    conConfig($this, tokenConfig('Gerente'))
        ->putJson('/api/configuracion', [
            'config_mesas' => [
                ['cantidad' => 2, 'capacidad' => 6],
                ['cantidad' => 3, 'capacidad' => 4],
            ],
        ])
        ->assertOk()
        ->assertJsonPath('configuracion.aforo', 24)
        ->assertJsonPath('configuracion.mesas_maximas', 5);

    // Replace-all: la fila vieja (2×4) ya no está.
    expect(ConfigMesa::count())->toBe(2)
        ->and(ConfigMesa::where('capacidad', 4)->count())->toBe(1)
        ->and(ConfigMesa::where('capacidad', 6)->count())->toBe(1);
});

test('el put de configuracion valida la forma del body', function () {
    $gerente = conConfig($this, tokenConfig('Gerente'));

    $gerente->putJson('/api/configuracion', [])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['config_mesas']);

    $gerente->putJson('/api/configuracion', [
        'config_mesas' => [['cantidad' => 0, 'capacidad' => 4]],
    ])->assertStatus(422)->assertJsonValidationErrors(['config_mesas.0.cantidad']);

    $gerente->putJson('/api/configuracion', [
        'config_mesas' => [['cantidad' => 2, 'capacidad' => 0]],
    ])->assertStatus(422)->assertJsonValidationErrors(['config_mesas.0.capacidad']);
});

test('no se puede bajar el tope de mesas por debajo de las vivas', function () {
    fijarConfig([['cantidad' => 5, 'capacidad' => 4]]);

    $mzo = conConfig($this, tokenConfig('Mozo'));
    $mzo->postJson('/api/mesas', ['capacidad' => 2])->assertStatus(201);
    $mzo->postJson('/api/mesas', ['capacidad' => 2])->assertStatus(201);

    conConfig($this, tokenConfig('Gerente'))
        ->putJson('/api/configuracion', [
            'config_mesas' => [['cantidad' => 1, 'capacidad' => 20]],
        ])
        ->assertStatus(422)
        ->assertJsonPath('message', 'No se puede bajar la cantidad de mesas a 1: hay 2 mesas vivas.');
});

test('crear mesa respeta el tope de mesas de la composicion', function () {
    fijarConfig([['cantidad' => 2, 'capacidad' => 4]]);

    $mzo = conConfig($this, tokenConfig('Mozo'));
    $mzo->postJson('/api/mesas', ['capacidad' => 2])->assertStatus(201);
    $mzo->postJson('/api/mesas', ['capacidad' => 2])->assertStatus(201);

    // El aforo (8) aún da holgura: lo que falla es el TOPE de mesas.
    $mzo->postJson('/api/mesas', ['capacidad' => 2])
        ->assertStatus(422)
        ->assertJsonPath('message', 'Se supera la cantidad de mesas permitidas: máximo 2, vivas 2.');
});

test('la configuracion la lee cualquier empleado y la edita solo gestionar_mesas', function () {
    // Sin token (antes de poner el header de un empleado: recuerda
    // que withToken persiste en el TestCase).
    $this->getJson('/api/configuracion')->assertUnauthorized();

    conConfig($this, tokenConfig('Mozo'))
        ->getJson('/api/configuracion')
        ->assertOk();

    conConfig($this, tokenConfig('Mozo'))
        ->putJson('/api/configuracion', [
            'config_mesas' => [['cantidad' => 1, 'capacidad' => 4]],
        ])->assertForbidden();
});
