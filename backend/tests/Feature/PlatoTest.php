<?php

use App\Models\Plato;
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
 * Regresión de la colisión de rutas: GET /platos/{id} (registrada
 * arriba, pública) se comía GET /platos/todos (requiere
 * gestionar_platos) → show("todos") tiraba TypeError/500. El fix es
 * ->whereNumber('id') en la ruta con {id}.
 */

function tokenPlato(string $rol): string
{
    $usuario = Usuario::factory()->create([
        'rol_id' => Rol::where('nombre', $rol)->first()->id,
    ]);

    return $usuario->createToken($rol)->plainTextToken;
}

/**
 * Resetea la identidad cacheada del guard y pone el token.
 */
function conPlato(TestCase $test, string $token): TestCase
{
    app('auth')->forgetGuards();

    return $test->withToken($token);
}

test('platos/todos responde 200 para el gerente (no lo come platos/{id})', function () {
    Plato::factory()->create(['nombre' => 'Milanesa']);

    conPlato($this, tokenPlato('Gerente'))
        ->getJson('/api/platos/todos')
        ->assertOk()
        ->assertJsonPath('0.nombre', 'Milanesa');
});

test('platos/todos sigue exigiendo gestionar_platos', function () {
    conPlato($this, tokenPlato('Mozo'))
        ->getJson('/api/platos/todos')
        ->assertForbidden();
});

test('platos/{id} no numérico no matchea la ruta y responde 404', function () {
    conPlato($this, tokenPlato('Gerente'))
        ->getJson('/api/platos/abc')
        ->assertNotFound();
});
