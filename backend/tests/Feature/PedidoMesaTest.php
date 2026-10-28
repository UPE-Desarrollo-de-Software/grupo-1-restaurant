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

test('varios pedidos activos por mesa: cada orden nueva crea su raiz', function () {
    autenticarMozo();

    $mesa = Mesa::factory()->create();
    ['plato' => $plato] = platoDePrueba();

    $crear = fn (?int $pedidoId = null) => $this->postJson(
        "/api/mesas/{$mesa->id}/pedidos",
        array_filter([
            'platos' => [['plato_id' => $plato->id, 'cantidad' => 1]],
            'pedido_id' => $pedidoId,
        ], fn ($v) => $v !== null)
    );

    // Sin pedido_id: cada orden es una RAÍZ nueva (una por comensal).
    $crear()->assertStatus(201);
    $crear()->assertStatus(201);
    expect($mesa->pedidos()->count())->toBe(2)
        ->and($mesa->pedidos()->whereNotNull('pedido_padre_id')->count())->toBe(0);

    // Con pedido_id agrega a ese pedido si está en curso.
    $primero = $mesa->pedidos()->orderBy('id')->first();
    $crear($primero->id)->assertStatus(201);
    expect($mesa->pedidos()->count())->toBe(2)
        ->and($primero->fresh()->detalles()->count())->toBe(2);

    // Confirmado + enviado: el pedido dejó de estar en curso y no
    // admite más líneas...
    $this->postJson("/api/pedidos/{$primero->id}/confirmar")->assertStatus(200);
    $this->postJson("/api/pedidos/{$primero->id}/enviar")->assertStatus(200);
    $crear($primero->id)->assertStatus(422);

    // ...pero la mesa sigue abierta para nuevas órdenes.
    $crear()->assertStatus(201);
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

    // Agregar un extra al MISMO pedido (pedido_id): cobra su precio.
    $primero = $mesa->pedidos()->orderBy('id')->first();
    $response = $this->postJson("/api/mesas/{$mesa->id}/pedidos", [
        'platos' => [
            ['plato_id' => $plato->id, 'cantidad' => 1, 'ingredientes' => [$extra->id]],
        ],
        'pedido_id' => $primero->id,
    ])->assertStatus(201);

    expect((float) $response->json('pedido.total'))->toBe(2500.0);
});

test('la visita termina cuando el mozo cierra la mesa tras el pago', function () {
    autenticarMozo();

    $mesa = Mesa::factory()->create();
    ['plato' => $plato] = platoDePrueba();

    $this->postJson("/api/mesas/{$mesa->id}/pedidos", [
        'platos' => [['plato_id' => $plato->id, 'cantidad' => 1]],
    ])->assertStatus(201);

    $pedido = $mesa->pedidos()->first();

    // Envío en 2 pasos: confirmar (gate) y recién después enviar.
    $this->postJson("/api/pedidos/{$pedido->id}/enviar")->assertStatus(422);
    $this->postJson("/api/pedidos/{$pedido->id}/confirmar")->assertStatus(200);
    $this->postJson("/api/pedidos/{$pedido->id}/enviar")->assertStatus(200);

    // Cocina la prepara y la deja lista (permiso preparar_pedidos)...
    foreach (['en_preparacion', 'listo'] as $estado) {
        conCocina($this, tokenCocina())
            ->putJson("/api/cocina/pedidos/{$pedido->id}/estado", ['estado' => $estado])
            ->assertStatus(200);
    }

    // ...y recién ahí el mozo la entrega y la cierra.
    autenticarMozo();
    foreach (['entregado', 'cerrado'] as $estado) {
        $this->putJson("/api/pedidos/{$pedido->id}/estado", ['estado' => $estado])
            ->assertStatus(200);
    }

    expect($pedido->fresh()->estado)->toBe('cerrado');

    // El último pedido finalizado NO destruye la mesa: la visita sigue
    // viva hasta que el cliente pague y el mozo la cierre.
    expect(Mesa::find($mesa->id))->not->toBeNull();

    // Un pedido finalizado no admite cambios.
    $this->putJson("/api/pedidos/{$pedido->id}/estado", ['estado' => 'en_preparacion'])
        ->assertStatus(422);

    // El mozo cierra la visita (cliente pagó): la mesa queda DESTRUIDA
    // (borrado lógico), para la app dejó de existir.
    $this->postJson("/api/mesas/{$mesa->id}/cerrar")->assertStatus(200);

    expect(Mesa::find($mesa->id))->toBeNull()
        ->and(Mesa::withTrashed()->find($mesa->id))->not->toBeNull();

    // Ya cerrada, la mesa no existe más (404).
    $this->postJson("/api/mesas/{$mesa->id}/cerrar")->assertStatus(404);
});

test('la cancelacion de un pedido no cierra la mesa sin el pago', function () {
    autenticarMozo();

    $mesa = Mesa::factory()->create();
    ['plato' => $plato] = platoDePrueba();

    $this->postJson("/api/mesas/{$mesa->id}/pedidos", [
        'platos' => [['plato_id' => $plato->id, 'cantidad' => 1]],
    ])->assertStatus(201);

    $pedido = $mesa->pedidos()->first();

    $this->putJson("/api/pedidos/{$pedido->id}/estado", ['estado' => 'cancelado'])
        ->assertStatus(200);

    // Sin pedidos activos la mesa sigue VIVA: lo que termina la
    // visita es el pago (el cierre del mozo), no el ciclo del pedido.
    expect($pedido->fresh()->estado)->toBe('cancelado')
        ->and(Mesa::find($mesa->id))->not->toBeNull();

    $this->postJson("/api/mesas/{$mesa->id}/cerrar")->assertStatus(200);
    expect(Mesa::find($mesa->id))->toBeNull();
});

test('no se puede cerrar la mesa con pedidos activos', function () {
    autenticarMozo();

    $mesa = Mesa::factory()->create();
    ['plato' => $plato] = platoDePrueba();

    $this->postJson("/api/mesas/{$mesa->id}/pedidos", [
        'platos' => [['plato_id' => $plato->id, 'cantidad' => 1]],
    ])->assertStatus(201);

    $pedido = $mesa->pedidos()->first();

    $this->postJson("/api/mesas/{$mesa->id}/cerrar")
        ->assertStatus(422)
        ->assertJsonPath(
            'message',
            'No se puede cerrar la mesa: quedan pedidos activos. Cobrá la cuenta y cerrá (o cancelá) todos los pedidos primero.'
        );

    expect(Mesa::find($mesa->id))->not->toBeNull();

    // Cancelado el pedido (ya no quedan activos): ahora sí se cierra.
    $this->putJson("/api/pedidos/{$pedido->id}/estado", ['estado' => 'cancelado'])
        ->assertStatus(200);

    $this->postJson("/api/mesas/{$mesa->id}/cerrar")->assertStatus(200);
    expect(Mesa::find($mesa->id))->toBeNull();
});

test('cerrar la mesa exige tomar_pedidos', function () {
    $mesa = Mesa::factory()->create();

    // Sin token: 401.
    $this->postJson("/api/mesas/{$mesa->id}/cerrar")->assertStatus(401);

    // Cocina no tiene tomar_pedidos: 403.
    $cocina = Usuario::factory()->create([
        'rol_id' => Rol::where('nombre', 'Cocina')->first()->id,
    ]);
    Sanctum::actingAs($cocina);
    $this->postJson("/api/mesas/{$mesa->id}/cerrar")->assertStatus(403);

    // Mozo (tomar_pedidos): puede cerrar la visita.
    app('auth')->forgetGuards();
    autenticarMozo();
    $this->postJson("/api/mesas/{$mesa->id}/cerrar")->assertStatus(200);

    expect(Mesa::find($mesa->id))->toBeNull();
});
