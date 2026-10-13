<?php

use App\Models\Ingrediente;
use App\Models\Mesa;
use App\Models\Plato;
use App\Models\Rol;
use App\Models\Usuario;
use Database\Seeders\PermisoSeeder;
use Database\Seeders\RolSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function () {
    // Permisos (ROL_PERMISO) y roles, como en producción.
    $this->seed([PermisoSeeder::class, RolSeeder::class]);
});

/**
 * Autentica un mozo (rol con el permiso tomar_pedidos).
 */
function autenticarMozo(): void
{
    $mozo = Usuario::factory()->create([
        'rol_id' => Rol::where('nombre', 'Mozo')->first()->id,
    ]);

    Sanctum::actingAs($mozo);
}

/**
 * Crea un plato con tres ingredientes: uno excluible, uno estructural
 * (opcional=false) y un extra que se agrega con recargo.
 *
 * @return array{plato: Plato, excluible: Ingrediente, estructural: Ingrediente, extra: Ingrediente}
 */
function platoDePrueba(): array
{
    $plato = Plato::factory()->create(['precio' => 1000]);

    $excluible = Ingrediente::factory()->create(['precioAdicional' => 0]);
    $estructural = Ingrediente::factory()->create(['precioAdicional' => 0]);
    $extra = Ingrediente::factory()->create(['precioAdicional' => 500]);

    $plato->ingredientes()->attach($excluible->id, ['opcional' => true, 'por_defecto' => true]);
    $plato->ingredientes()->attach($estructural->id, ['opcional' => false, 'por_defecto' => true]);
    $plato->ingredientes()->attach($extra->id, ['opcional' => true, 'por_defecto' => false]);

    return compact('plato', 'excluible', 'estructural', 'extra');
}

test('el mozo abre un pedido en una mesa y la mesa queda ocupada', function () {
    autenticarMozo();

    $mesa = Mesa::factory()->create();
    ['plato' => $plato, 'extra' => $extra] = platoDePrueba();

    $response = $this->postJson("/api/mesas/{$mesa->id}/pedidos", [
        'platos' => [
            ['plato_id' => $plato->id, 'cantidad' => 2, 'ingredientes' => [$extra->id]],
        ],
    ]);

    $response->assertStatus(201);

    // La mesa pasa a 'ocupada' con el primer pedido no finalizado.
    expect($mesa->fresh()->estado)->toBe('ocupada');

    // subtotal = 2 × (1000 de lista + 500 del extra) = 3000.
    $pedido = $response->json('pedido');
    expect((float) $pedido['total'])->toBe(3000.0);

    // El agregado se registra en DETALLE_INGREDIENTE con su recargo.
    expect(DB::table('detalle_pedido_ingrediente')->where('tipo', 'agregado')->count())->toBe(1);
});

test('no se pueden abrir dos pedidos activos en la misma mesa', function () {
    autenticarMozo();

    $mesa = Mesa::factory()->create();
    ['plato' => $plato] = platoDePrueba();

    $crear = fn () => $this->postJson("/api/mesas/{$mesa->id}/pedidos", [
        'platos' => [['plato_id' => $plato->id, 'cantidad' => 1]],
    ]);

    $crear()->assertStatus(201);

    // Mientras siga "en curso", agregar líneas va al MISMO pedido.
    $crear()->assertStatus(201);
    expect($mesa->pedidos()->count())->toBe(1);

    // Enviado a cocina: ya no admite más líneas (1 pedido activo).
    $pedido = $mesa->pedidos()->first();
    $this->postJson("/api/pedidos/{$pedido->id}/enviar")->assertStatus(200);

    $crear()->assertStatus(422);
});

test('respeta los flags opcional y por_defecto al personalizar ingredientes', function () {
    autenticarMozo();

    $mesa = Mesa::factory()->create();
    ['plato' => $plato, 'excluible' => $excluible, 'estructural' => $estructural, 'extra' => $extra] = platoDePrueba();

    // Excluir un ingrediente opcional que viene por defecto: OK, sin cargo.
    $this->postJson("/api/mesas/{$mesa->id}/pedidos", [
        'platos' => [
            ['plato_id' => $plato->id, 'cantidad' => 1, 'excluir' => [$excluible->id]],
        ],
    ])->assertStatus(201);

    expect(DB::table('detalle_pedido_ingrediente')->where('tipo', 'excluido')->count())->toBe(1);
    expect(DB::table('detalle_pedido_ingrediente')->where('tipo', 'excluido')->value('precio_adicional'))->toBeNull();

    // Excluir algo que no es opcional: rechazado.
    $this->postJson("/api/mesas/{$mesa->id}/pedidos", [
        'platos' => [
            ['plato_id' => $plato->id, 'cantidad' => 1, 'excluir' => [$estructural->id]],
        ],
    ])->assertStatus(422);

    // Agregar algo que ya viene por defecto: rechazado.
    $this->postJson("/api/mesas/{$mesa->id}/pedidos", [
        'platos' => [
            ['plato_id' => $plato->id, 'cantidad' => 1, 'ingredientes' => [$excluible->id]],
        ],
    ])->assertStatus(422);

    // Agregar un extra: cobra su precio adicional.
    $response = $this->postJson("/api/mesas/{$mesa->id}/pedidos", [
        'platos' => [
            ['plato_id' => $plato->id, 'cantidad' => 1, 'ingredientes' => [$extra->id]],
        ],
    ])->assertStatus(201);

    expect((float) $response->json('pedido.total'))->toBe(2500.0);
});

test('el flujo de estados del pedido libera la mesa al cerrar', function () {
    autenticarMozo();

    $mesa = Mesa::factory()->create();
    ['plato' => $plato] = platoDePrueba();

    $this->postJson("/api/mesas/{$mesa->id}/pedidos", [
        'platos' => [['plato_id' => $plato->id, 'cantidad' => 1]],
    ])->assertStatus(201);

    $pedido = $mesa->pedidos()->first();

    $this->postJson("/api/pedidos/{$pedido->id}/enviar")->assertStatus(200);

    // Flujo del DER: enviado → en_preparacion → entregado → cerrado.
    foreach (['en_preparacion', 'entregado', 'cerrado'] as $estado) {
        $this->putJson("/api/pedidos/{$pedido->id}/estado", ['estado' => $estado])
            ->assertStatus(200);
    }

    expect($pedido->fresh()->estado)->toBe('cerrado');
    expect($mesa->fresh()->estado)->toBe('libre');

    // Un pedido finalizado no admite cambios.
    $this->putJson("/api/pedidos/{$pedido->id}/estado", ['estado' => 'en_preparacion'])
        ->assertStatus(422);
});

test('cancelar el pedido tambien libera la mesa', function () {
    autenticarMozo();

    $mesa = Mesa::factory()->create();
    ['plato' => $plato] = platoDePrueba();

    $this->postJson("/api/mesas/{$mesa->id}/pedidos", [
        'platos' => [['plato_id' => $plato->id, 'cantidad' => 1]],
    ])->assertStatus(201);

    $pedido = $mesa->pedidos()->first();

    $this->putJson("/api/pedidos/{$pedido->id}/estado", ['estado' => 'cancelado'])
        ->assertStatus(200);

    expect($pedido->fresh()->estado)->toBe('cancelado');
    expect($mesa->fresh()->estado)->toBe('libre');
});
