<?php

use App\Models\Ingrediente;
use App\Models\Mesa;
use App\Models\Plato;
use App\Models\Rol;
use App\Models\Usuario;
use Database\Seeders\PermisoSeeder;
use Database\Seeders\RolSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed([PermisoSeeder::class, RolSeeder::class]);
});

/**
 * Gerente = todos los permisos (promos, platos, mesas, pedidos).
 * Se llama DENTRO de cada test, justo antes de los requests.
 */
function gerentePromo(): void
{
    app('auth')->forgetGuards();

    $gerente = Usuario::factory()->create([
        'rol_id' => Rol::where('nombre', 'Gerente')->first()->id,
    ]);

    Sanctum::actingAs($gerente);
}

/** Plato de $1000 con un extra opcional de $500 (para la base del descuento). */
function platoPromo(float $precio = 1000): Plato
{
    $plato = Plato::factory()->create(['precio' => $precio]);
    $extra = Ingrediente::factory()->create(['precioAdicional' => 500]);

    $plato->ingredientes()->attach($extra->id, ['opcional' => true, 'por_defecto' => false]);

    return $plato;
}

/** Body completo para PUT /api/platos/{id} (todos los required). */
function bodyPlato(Plato $plato, ?int $promocionId = null): array
{
    return [
        'categoria_id' => $plato->categoria_id,
        'promocion_id' => $promocionId,
        'nombre' => $plato->nombre,
        'precio' => $plato->precio,
        'disponible' => true,
    ];
}

// ==================== ABM ====================

test('el gerente crea una promocion porcentaje', function () {
    gerentePromo();

    $this->postJson('/api/promociones', [
        'nombre' => 'Media temporada',
        'tipo' => 'porcentaje',
        'valor' => 25,
    ])
        ->assertCreated()
        ->assertJsonPath('promocion.tipo', 'porcentaje');

    expect((float) $this->getJson('/api/promociones')->assertOk()->json()[0]['valor'])
        ->toEqual(25.0);
});

test('un porcentaje mayor a 100 responde 422', function () {
    gerentePromo();

    $this->postJson('/api/promociones', [
        'nombre' => 'Invalida',
        'tipo' => 'porcentaje',
        'valor' => 101,
    ])->assertUnprocessable();
});

test('una promocion 2x1 guardada con valor lo anula a null', function () {
    gerentePromo();

    $crear = $this->postJson('/api/promociones', [
        'nombre' => '2x1 hamburguesas',
        'tipo' => '2x1',
        'valor' => 50,
    ])->assertCreated();

    expect($crear->json('promocion.valor'))->toBeNull();
});

test('fecha_fin anterior a fecha_inicio responde 422', function () {
    gerentePromo();

    $this->postJson('/api/promociones', [
        'nombre' => 'Fechas mal',
        'tipo' => 'porcentaje',
        'valor' => 10,
        'fecha_inicio' => '2026-11-01',
        'fecha_fin' => '2026-10-01',
    ])->assertUnprocessable();
});

test('listar promociones exige autenticacion', function () {
    $this->getJson('/api/promociones')->assertUnauthorized();

    gerentePromo();
    $this->getJson('/api/promociones')->assertOk();
});

test('consultar una promocion inexistente responde 200 con message', function () {
    gerentePromo();

    $this->getJson('/api/promociones/9999')
        ->assertOk()
        ->assertJson(['message' => 'No se encontraron promociones']);
});

test('se puede eliminar una promocion que nunca se aplico', function () {
    gerentePromo();

    $id = $this->postJson('/api/promociones', [
        'nombre' => 'Sin uso',
        'tipo' => 'monto_fijo',
        'valor' => 100,
    ])->assertCreated()->json('promocion.id');

    $this->deleteJson("/api/promociones/{$id}")->assertOk();
});

test('no se puede eliminar una promocion ya aplicada en pedidos', function () {
    gerentePromo();

    $plato = platoPromo();
    $id = $this->postJson('/api/promociones', [
        'nombre' => 'Aplicada',
        'tipo' => 'porcentaje',
        'valor' => 10,
    ])->json('promocion.id');

    $this->putJson("/api/platos/{$plato->id}", bodyPlato($plato, $id))->assertOk();

    $mesa = Mesa::factory()->create();
    $this->postJson("/api/mesas/{$mesa->id}/pedidos", [
        'platos' => [['plato_id' => $plato->id, 'cantidad' => 1]],
    ])->assertCreated();

    $this->deleteJson("/api/promociones/{$id}")
        ->assertUnprocessable()
        ->assertJson(['message' => 'La promo ya se aplicó en pedidos: no se puede eliminar, desactivala.']);
});

// ==================== MOTOR (los 4 tipos) ====================

test('porcentaje 50% descuenta solo sobre el precio de lista', function () {
    gerentePromo();

    $plato = platoPromo(); // 1000 + extra opcional 500
    $extra = $plato->ingredientes->first();

    $id = $this->postJson('/api/promociones', [
        'nombre' => '50%',
        'tipo' => 'porcentaje',
        'valor' => 50,
    ])->json('promocion.id');

    $this->putJson("/api/platos/{$plato->id}", bodyPlato($plato, $id))->assertOk();

    $mesa = Mesa::factory()->create();
    $this->postJson("/api/mesas/{$mesa->id}/pedidos", [
        'platos' => [[
            'plato_id' => $plato->id,
            'cantidad' => 2,
            'ingredientes' => [$extra->id],
        ]],
    ])->assertCreated();

    $linea = $this->getJson("/api/mesas/{$mesa->id}/pedidos")->assertOk()
        ->json('pedidos.0.lineas.0');

    // base solo lista: 50% × 1000 × 2 = 1000 de descuento (el extra
    // de 500 c/u NO entra en la base).
    expect($linea['subtotal'])->toEqual(2000.0)
        ->and($linea['descuento'])->toEqual(1000.0)
        ->and($linea['promocion']['id'])->toEqual($id);
});

test('monto_fijo mayor al precio deja el subtotal en cero', function () {
    gerentePromo();

    $plato = platoPromo();
    $id = $this->postJson('/api/promociones', [
        'nombre' => '3000 off',
        'tipo' => 'monto_fijo',
        'valor' => 3000,
    ])->json('promocion.id');

    $this->putJson("/api/platos/{$plato->id}", bodyPlato($plato, $id))->assertOk();

    $mesa = Mesa::factory()->create();
    $this->postJson("/api/mesas/{$mesa->id}/pedidos", [
        'platos' => [['plato_id' => $plato->id, 'cantidad' => 1]],
    ])->assertCreated();

    $linea = $this->getJson("/api/mesas/{$mesa->id}/pedidos")->json('pedidos.0.lineas.0');

    expect($linea['subtotal'])->toEqual(0.0)
        ->and($linea['descuento'])->toEqual(1000.0);
});

test('precio_fijo reemplaza el precio de lista por unidad', function () {
    gerentePromo();

    $plato = platoPromo();
    $id = $this->postJson('/api/promociones', [
        'nombre' => 'A 800',
        'tipo' => 'precio_fijo',
        'valor' => 800,
    ])->json('promocion.id');

    $this->putJson("/api/platos/{$plato->id}", bodyPlato($plato, $id))->assertOk();

    $mesa = Mesa::factory()->create();
    $this->postJson("/api/mesas/{$mesa->id}/pedidos", [
        'platos' => [['plato_id' => $plato->id, 'cantidad' => 3]],
    ])->assertCreated();

    $linea = $this->getJson("/api/mesas/{$mesa->id}/pedidos")->json('pedidos.0.lineas.0');

    expect($linea['subtotal'])->toEqual(2400.0)
        ->and($linea['descuento'])->toEqual(600.0);
});

test('2x1 cobra ceil(cantidad/2) unidades de lista', function () {
    gerentePromo();

    $plato = platoPromo();
    $id = $this->postJson('/api/promociones', [
        'nombre' => '2x1',
        'tipo' => '2x1',
    ])->json('promocion.id');

    $this->putJson("/api/platos/{$plato->id}", bodyPlato($plato, $id))->assertOk();

    $mesa = Mesa::factory()->create();

    foreach ([1, 2, 3, 4] as $cantidad) {
        $this->postJson("/api/mesas/{$mesa->id}/pedidos", [
            'platos' => [['plato_id' => $plato->id, 'cantidad' => $cantidad]],
        ])->assertCreated();
    }

    $pedidos = $this->getJson("/api/mesas/{$mesa->id}/pedidos")->json('pedidos');
    $lineas = array_map(fn (array $p) => $p['lineas'][0], $pedidos);

    // pagás ceil(c/2) × 1000: c=1→1000, c=2→1000, c=3→2000, c=4→2000
    expect($lineas[0]['subtotal'])->toEqual(1000.0)
        ->and($lineas[0]['descuento'])->toEqual(0.0)
        ->and($lineas[1]['subtotal'])->toEqual(1000.0)
        ->and($lineas[1]['descuento'])->toEqual(1000.0)
        ->and($lineas[2]['subtotal'])->toEqual(2000.0)
        ->and($lineas[2]['descuento'])->toEqual(1000.0)
        ->and($lineas[3]['subtotal'])->toEqual(2000.0)
        ->and($lineas[3]['descuento'])->toEqual(2000.0);
});

// ==================== VIGENCIA Y CONGELAMIENTO ====================

test('una promocion inactiva no se aplica a la linea', function () {
    gerentePromo();

    $plato = platoPromo();
    $id = $this->postJson('/api/promociones', [
        'nombre' => 'Desactivada',
        'tipo' => 'porcentaje',
        'valor' => 50,
        'activo' => false,
    ])->json('promocion.id');

    $this->putJson("/api/platos/{$plato->id}", bodyPlato($plato, $id))->assertOk();

    $mesa = Mesa::factory()->create();
    $this->postJson("/api/mesas/{$mesa->id}/pedidos", [
        'platos' => [['plato_id' => $plato->id, 'cantidad' => 2]],
    ])->assertCreated();

    $linea = $this->getJson("/api/mesas/{$mesa->id}/pedidos")->json('pedidos.0.lineas.0');

    expect($linea['subtotal'])->toEqual(2000.0)
        ->and($linea['descuento'])->toEqual(0.0)
        ->and($linea['promocion'])->toBeNull();
});

test('desactivar la promocion despues de pedir conserva el descuento congelado', function () {
    gerentePromo();

    $plato = platoPromo();
    $id = $this->postJson('/api/promociones', [
        'nombre' => 'Activa',
        'tipo' => 'porcentaje',
        'valor' => 50,
    ])->json('promocion.id');

    $this->putJson("/api/platos/{$plato->id}", bodyPlato($plato, $id))->assertOk();

    $mesa = Mesa::factory()->create();
    $this->postJson("/api/mesas/{$mesa->id}/pedidos", [
        'platos' => [['plato_id' => $plato->id, 'cantidad' => 2]],
    ])->assertCreated();

    $this->putJson("/api/promociones/{$id}", [
        'nombre' => 'Activa',
        'tipo' => 'porcentaje',
        'valor' => 50,
        'activo' => false,
    ])->assertOk();

    $linea = $this->getJson("/api/mesas/{$mesa->id}/pedidos")->json('pedidos.0.lineas.0');

    expect($linea['subtotal'])->toEqual(1000.0)
        ->and($linea['descuento'])->toEqual(1000.0);
});

// ==================== RECALCULO AL EDITOR ====================

test('editar el valor recalcula lineas de pedidos abiertos y su total', function () {
    gerentePromo();

    $plato = platoPromo();
    $id = $this->postJson('/api/promociones', [
        'nombre' => '50%',
        'tipo' => 'porcentaje',
        'valor' => 50,
    ])->json('promocion.id');

    $this->putJson("/api/platos/{$plato->id}", bodyPlato($plato, $id))->assertOk();

    $mesa = Mesa::factory()->create();
    $this->postJson("/api/mesas/{$mesa->id}/pedidos", [
        'platos' => [['plato_id' => $plato->id, 'cantidad' => 2]],
    ])->assertCreated();

    $antes = $this->getJson("/api/mesas/{$mesa->id}/pedidos")->json('pedidos.0');
    expect($antes['lineas'][0]['subtotal'])->toEqual(1000.0)
        ->and($antes['total'])->toEqual(1000.0);

    $this->putJson("/api/promociones/{$id}", [
        'nombre' => '50%',
        'tipo' => 'porcentaje',
        'valor' => 10,
        'activo' => true,
    ])->assertOk();

    $despues = $this->getJson("/api/mesas/{$mesa->id}/pedidos")->json('pedidos.0');
    expect($despues['lineas'][0]['subtotal'])->toEqual(1800.0)
        ->and($despues['lineas'][0]['descuento'])->toEqual(200.0)
        ->and($despues['total'])->toEqual(1800.0);

    $cuenta = $this->getJson("/api/mesas/{$mesa->id}/cuenta")->assertOk()->json();
    expect($cuenta['total'])->toEqual(1800.0)
        ->and($cuenta['partes'][0]['lineas'][0]['descuento'])->toEqual(200.0);
});

test('editar el valor NO toca lineas de pedidos cerrados', function () {
    gerentePromo();

    $plato = platoPromo();
    $id = $this->postJson('/api/promociones', [
        'nombre' => '50%',
        'tipo' => 'porcentaje',
        'valor' => 50,
    ])->json('promocion.id');

    $this->putJson("/api/platos/{$plato->id}", bodyPlato($plato, $id))->assertOk();

    $mesa = Mesa::factory()->create();
    $pedidoId = $this->postJson("/api/mesas/{$mesa->id}/pedidos", [
        'platos' => [['plato_id' => $plato->id, 'cantidad' => 2]],
    ])->json('pedido.id');

    // Cerrar el pedido: confirmar → enviar → en_preparacion → entregado →
    // cerrado (al ser el único activo, la mesa queda destruida).
    $this->postJson("/api/pedidos/{$pedidoId}/confirmar")->assertOk();
    $this->postJson("/api/pedidos/{$pedidoId}/enviar")->assertOk();
    $this->putJson("/api/pedidos/{$pedidoId}/estado", ['estado' => 'en_preparacion'])->assertOk();
    $this->putJson("/api/pedidos/{$pedidoId}/estado", ['estado' => 'entregado'])->assertOk();
    $this->putJson("/api/pedidos/{$pedidoId}/estado", ['estado' => 'cerrado'])->assertOk();

    $this->putJson("/api/promociones/{$id}", [
        'nombre' => '50%',
        'tipo' => 'porcentaje',
        'valor' => 10,
        'activo' => true,
    ])->assertOk();

    // La cuenta histórica sigue mostrando el subtotal congelado.
    $cuenta = $this->getJson("/api/mesas/{$mesa->id}/cuenta")->assertOk()->json();
    expect($cuenta['partes'][0]['lineas'][0]['subtotal'])->toEqual(1000.0)
        ->and($cuenta['partes'][0]['lineas'][0]['descuento'])->toEqual(1000.0)
        ->and($cuenta['total'])->toEqual(1000.0);
});

test('editar solo el nombre no recalcula nada', function () {
    gerentePromo();

    $plato = platoPromo();
    $id = $this->postJson('/api/promociones', [
        'nombre' => 'Original',
        'tipo' => 'porcentaje',
        'valor' => 50,
    ])->json('promocion.id');

    $this->putJson("/api/platos/{$plato->id}", bodyPlato($plato, $id))->assertOk();

    $mesa = Mesa::factory()->create();
    $this->postJson("/api/mesas/{$mesa->id}/pedidos", [
        'platos' => [['plato_id' => $plato->id, 'cantidad' => 2]],
    ])->assertCreated();

    $this->putJson("/api/promociones/{$id}", [
        'nombre' => 'Renombrada',
        'tipo' => 'porcentaje',
        'valor' => 50,
        'activo' => true,
    ])->assertOk();

    $linea = $this->getJson("/api/mesas/{$mesa->id}/pedidos")->json('pedidos.0.lineas.0');
    expect($linea['subtotal'])->toEqual(1000.0)
        ->and($linea['descuento'])->toEqual(1000.0);
});

// ==================== LECTURA (CARTA) ====================

test('la carta muestra la promocion embebida solo si esta vigente', function () {
    gerentePromo();

    $plato = platoPromo();
    $id = $this->postJson('/api/promociones', [
        'nombre' => 'Vigente',
        'tipo' => 'porcentaje',
        'valor' => 50,
    ])->json('promocion.id');

    $this->putJson("/api/platos/{$plato->id}", bodyPlato($plato, $id))->assertOk();

    // vigente → viene embebida (la carta es /platos, público)
    $carta = $this->getJson('/api/platos')->assertOk()->json();
    $fila = collect($carta)->firstWhere('id', $plato->id);
    expect($fila['promocion'])->not->toBeNull()
        ->and($fila['promocion']['tipo'])->toEqual('porcentaje');

    // vencida (enero 2026) → null
    $this->putJson("/api/promociones/{$id}", [
        'nombre' => 'Vigente',
        'tipo' => 'porcentaje',
        'valor' => 50,
        'fecha_inicio' => '2026-01-01',
        'fecha_fin' => '2026-01-02',
        'activo' => true,
    ])->assertOk();

    $fila = collect($this->getJson('/api/platos')->json())->firstWhere('id', $plato->id);
    expect($fila['promocion'])->toBeNull();

    // desactivada → null
    $this->putJson("/api/promociones/{$id}", [
        'nombre' => 'Vigente',
        'tipo' => 'porcentaje',
        'valor' => 50,
        'activo' => false,
    ])->assertOk();

    $fila = collect($this->getJson('/api/platos')->json())->firstWhere('id', $plato->id);
    expect($fila['promocion'])->toBeNull();
});
