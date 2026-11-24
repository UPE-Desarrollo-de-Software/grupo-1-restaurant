<?php

use App\Models\Categoria;
use App\Models\Ingrediente;
use App\Models\Plato;
use App\Models\Rol;
use App\Models\Usuario;
use Database\Seeders\PermisoSeeder;
use Database\Seeders\RolSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
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

test('el alta guarda el recargo propio del ingrediente en el plato', function () {
    $categoria = Categoria::factory()->create();
    // El catálogo está en 0: el valor que se cobra es el del plato.
    $ingrediente = Ingrediente::factory()->create(['precioAdicional' => 0]);

    $response = conPlato($this, tokenPlato('Gerente'))->postJson('/api/platos', [
        'categoria_id' => $categoria->id,
        'nombre' => 'Pizza especial',
        'descripcion' => '',
        'precio' => 5000,
        'disponible' => true,
        'ingredientes' => [[
            'ingrediente_id' => $ingrediente->id,
            'opcional' => true,
            'por_defecto' => false,
            'precio_adicional' => 1450,
        ]],
    ])->assertStatus(201);

    $platoId = $response->json('plato.id');

    expect((float) $response->json('plato.ingredientes.0.precioAdicional'))->toBe(1450.0)
        ->and((float) DB::table('plato_ingrediente')->where('plato_id', $platoId)->value('precio_adicional'))->toBe(1450.0);
});

test('show expone el recargo efectivo del plato y el crudo del pivot', function () {
    $plato = Plato::factory()->create();
    $conOverride = Ingrediente::factory()->create(['precioAdicional' => 900]);
    $heredado = Ingrediente::factory()->create(['precioAdicional' => 700]);

    $plato->ingredientes()->attach($conOverride->id, [
        'opcional' => true,
        'por_defecto' => false,
        'precio_adicional' => 1200,
    ]);
    $plato->ingredientes()->attach($heredado->id, [
        'opcional' => true,
        'por_defecto' => false,
    ]);

    $ingredientes = collect($this->getJson("/api/platos/{$plato->id}")->assertOk()->json('ingredientes'))
        ->keyBy('id');

    expect((float) $ingredientes[$conOverride->id]['precioAdicional'])->toBe(1200.0)
        ->and((float) $ingredientes[$conOverride->id]['pivot']['precio_adicional'])->toBe(1200.0)
        ->and((float) $ingredientes[$heredado->id]['precioAdicional'])->toBe(700.0)
        ->and($ingredientes[$heredado->id]['pivot']['precio_adicional'])->toBeNull();
});

test('el PUT borra el recargo del plato cuando se envía null', function () {
    $plato = Plato::factory()->create(['precio' => 5000]);
    $ingrediente = Ingrediente::factory()->create(['precioAdicional' => 900]);

    $plato->ingredientes()->attach($ingrediente->id, [
        'opcional' => true,
        'por_defecto' => false,
        'precio_adicional' => 1200,
    ]);

    conPlato($this, tokenPlato('Gerente'))->putJson("/api/platos/{$plato->id}", [
        'categoria_id' => $plato->categoria_id,
        'nombre' => $plato->nombre,
        'descripcion' => $plato->descripcion,
        'precio' => 5000,
        'disponible' => true,
        'ingredientes' => [[
            'ingrediente_id' => $ingrediente->id,
            'opcional' => true,
            'por_defecto' => false,
            'precio_adicional' => null,
        ]],
    ])->assertOk();

    expect(DB::table('plato_ingrediente')->where('plato_id', $plato->id)->value('precio_adicional'))->toBeNull();
});
