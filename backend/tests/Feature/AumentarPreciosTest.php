<?php

use App\Models\Categoria;
use App\Models\Mesa;
use App\Models\Plato;
use App\Models\Rol;
use App\Models\Usuario;
use Database\Seeders\PermisoSeeder;
use Database\Seeders\RolSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed([PermisoSeeder::class, RolSeeder::class]);

    $this->categoria = Categoria::factory()->create();
});

/*
|--------------------------------------------------------------------------
| Helpers (nombres únicos: las funciones de Pest son globales)
|--------------------------------------------------------------------------
*/

function tokenAumento(string $rol): string
{
    $usuario = Usuario::factory()->create([
        'rol_id' => Rol::where('nombre', $rol)->first()->id,
    ]);

    return $usuario->createToken($rol)->plainTextToken;
}

function platoAumento(int $categoriaId, float $precio, bool $disponible = true): Plato
{
    return Plato::factory()->create([
        'categoria_id' => $categoriaId,
        'precio' => $precio,
        'disponible' => $disponible,
    ]);
}

/**
 * POST /api/platos/aumentar-precios como el rol indicado (Gerente por defecto).
 */
function aumentarPrecios(array $payload, string $rol = 'Gerente')
{
    // Resetea la identidad cacheada del guard entre requests del mismo test.
    app('auth')->forgetGuards();

    return test()
        ->withToken(tokenAumento($rol))
        ->postJson('/api/platos/aumentar-precios', $payload);
}

/*
|--------------------------------------------------------------------------
| Cálculo
|--------------------------------------------------------------------------
*/

test('aumenta por porcentaje redondeando a 50', function () {
    $a = platoAumento($this->categoria->id, 1850); // 2035 → 2050
    $b = platoAumento($this->categoria->id, 1000); // 1100 → 1100

    aumentarPrecios([
        'categoria_id' => $this->categoria->id,
        'tipo' => 'porcentaje',
        'valor' => 10,
        'redondeo' => 50,
    ])
        ->assertOk()
        ->assertJsonPath('total', 2)
        ->assertJsonStructure([
            'message',
            'total',
            'actualizados' => [['id', 'nombre', 'precio_anterior', 'precio_nuevo']],
        ]);

    expect((float) $a->fresh()->precio)->toBe(2050.0)
        ->and((float) $b->fresh()->precio)->toBe(1100.0);
});

test('aumenta por porcentaje redondeando a 100', function () {
    $a = platoAumento($this->categoria->id, 1850); // 2035 → 2000

    aumentarPrecios([
        'categoria_id' => $this->categoria->id,
        'tipo' => 'porcentaje',
        'valor' => 10,
        'redondeo' => 100,
    ])->assertOk();

    expect((float) $a->fresh()->precio)->toBe(2000.0);
});

test('aumenta por monto fijo', function () {
    $a = platoAumento($this->categoria->id, 1850);

    aumentarPrecios([
        'categoria_id' => $this->categoria->id,
        'tipo' => 'monto',
        'valor' => 200,
        'redondeo' => null,
    ])->assertOk();

    expect((float) $a->fresh()->precio)->toBe(2050.0);
});

test('sin redondeo conserva 2 decimales', function () {
    $a = platoAumento($this->categoria->id, 1999.99); // 2199.989 → 2199.99

    aumentarPrecios([
        'categoria_id' => $this->categoria->id,
        'tipo' => 'porcentaje',
        'valor' => 10,
        'redondeo' => null,
    ])->assertOk();

    expect((float) $a->fresh()->precio)->toBe(2199.99);
});

test('nunca baja el precio cuando el redondeo lo comería', function () {
    $a = platoAumento($this->categoria->id, 1850); // 1860 → redondea a 1850 → sube a 1900

    aumentarPrecios([
        'categoria_id' => $this->categoria->id,
        'tipo' => 'monto',
        'valor' => 10,
        'redondeo' => 50,
    ])->assertOk();

    expect((float) $a->fresh()->precio)->toBe(1900.0);
});

/*
|--------------------------------------------------------------------------
| Alcance
|--------------------------------------------------------------------------
*/

test('todos afecta toda la carta, activos y pausados', function () {
    $otraCategoria = Categoria::factory()->create();

    $a = platoAumento($this->categoria->id, 1000);
    $b = platoAumento($otraCategoria->id, 2000, disponible: false);

    aumentarPrecios(['todos' => true, 'tipo' => 'monto', 'valor' => 100, 'redondeo' => null])
        ->assertOk()
        ->assertJsonPath('total', 2);

    expect((float) $a->fresh()->precio)->toBe(1100.0)
        ->and((float) $b->fresh()->precio)->toBe(2100.0);
});

test('una categoría no toca los platos de otras', function () {
    $otraCategoria = Categoria::factory()->create();

    $propio = platoAumento($this->categoria->id, 1000);
    $ajeno = platoAumento($otraCategoria->id, 1000);

    aumentarPrecios([
        'categoria_id' => $this->categoria->id,
        'tipo' => 'monto',
        'valor' => 100,
        'redondeo' => null,
    ])->assertOk()->assertJsonPath('total', 1);

    expect((float) $propio->fresh()->precio)->toBe(1100.0)
        ->and((float) $ajeno->fresh()->precio)->toBe(1000.0);
});

/*
|--------------------------------------------------------------------------
| Validaciones y reglas de dominio (422)
|--------------------------------------------------------------------------
*/

test('rechaza una categoría sin platos', function () {
    aumentarPrecios([
        'categoria_id' => $this->categoria->id,
        'tipo' => 'monto',
        'valor' => 100,
    ])->assertStatus(422);
});

test('rechaza valor 0', function () {
    $a = platoAumento($this->categoria->id, 1000);

    aumentarPrecios([
        'categoria_id' => $this->categoria->id,
        'tipo' => 'monto',
        'valor' => 0,
    ])->assertStatus(422);

    expect((float) $a->fresh()->precio)->toBe(1000.0);
});

test('rechaza si no se elige ni categoría ni todos', function () {
    platoAumento($this->categoria->id, 1000);

    aumentarPrecios(['tipo' => 'monto', 'valor' => 100])->assertStatus(422);
    aumentarPrecios(['todos' => false, 'tipo' => 'monto', 'valor' => 100])->assertStatus(422);
});

test('rechaza si se eligen categoría y todos a la vez', function () {
    platoAumento($this->categoria->id, 1000);

    aumentarPrecios([
        'todos' => true,
        'categoria_id' => $this->categoria->id,
        'tipo' => 'monto',
        'valor' => 100,
    ])->assertStatus(422);
});

test('rechaza tipo o redondeo inválidos', function () {
    platoAumento($this->categoria->id, 1000);

    aumentarPrecios(['todos' => true, 'tipo' => 'otro', 'valor' => 10])->assertStatus(422);
    aumentarPrecios(['todos' => true, 'tipo' => 'monto', 'valor' => 10, 'redondeo' => 25])->assertStatus(422);
});

/*
|--------------------------------------------------------------------------
| Permisos
|--------------------------------------------------------------------------
*/

test('devuelve 403 sin el permiso gestionar_platos', function () {
    $a = platoAumento($this->categoria->id, 1000);

    aumentarPrecios(['todos' => true, 'tipo' => 'monto', 'valor' => 100], rol: 'Mozo')
        ->assertForbidden();

    expect((float) $a->fresh()->precio)->toBe(1000.0);
});

/*
|--------------------------------------------------------------------------
| Pedidos existentes
|--------------------------------------------------------------------------
*/

test('no modifica el precio_lista de pedidos existentes', function () {
    $a = platoAumento($this->categoria->id, 1000);

    $mesa = Mesa::factory()->create();

    $pedidoId = DB::table('pedidos')->insertGetId([
        'mesa_id' => $mesa->id,
        'total' => 2000,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $detalleId = DB::table('detalle_pedidos')->insertGetId([
        'pedido_id' => $pedidoId,
        'plato_id' => $a->id,
        'cantidad' => 2,
        'precio_lista' => 1000,
        'subtotal' => 2000,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    aumentarPrecios(['todos' => true, 'tipo' => 'monto', 'valor' => 500, 'redondeo' => null])
        ->assertOk();

    expect((float) $a->fresh()->precio)->toBe(1500.0)
        ->and((float) DB::table('detalle_pedidos')->where('id', $detalleId)->value('precio_lista'))
        ->toBe(1000.0);
});
