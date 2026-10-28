<?php

use App\Models\Mesa;
use App\Models\Pedido;
use App\Models\Plato;
use App\Models\Rol;
use App\Models\Usuario;
use Database\Seeders\ConfigMesaSeeder;
use Database\Seeders\PermisoSeeder;
use Database\Seeders\RolSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed([PermisoSeeder::class, RolSeeder::class]);
});

/*
 * COCINA (GET/PUT /api/cocina/pedidos*, permiso preparar_pedidos).
 * La cocina solo VE la cola (enviado + en_preparacion) y solo AVANZA
 * su tramo del flujo: enviado → en_preparacion → listo. El resto
 * (entregado, cerrado, cancel) es del mozo.
 *
 * OJO: helpers globales ya definidos en otros tests (autenticarMozo,
 * tokenMozo, conMozo, gerentePromo, tokenReporte…) no se redeclaran
 * acá.
 */

/**
 * Token de un cocinero (rol Cocina, con preparar_pedidos).
 */
function tokenCocina(): string
{
    $usuario = Usuario::factory()->create([
        'rol_id' => Rol::where('nombre', 'Cocina')->first()->id,
    ]);

    return $usuario->createToken('Cocina')->plainTextToken;
}

/**
 * Resetea la identidad cacheada del guard y pone el token de cocina.
 */
function conCocina(TestCase $test, string $token): TestCase
{
    app('auth')->forgetGuards();

    return $test->withToken($token);
}

/**
 * Resetea la identidad cacheada y autentica un empleado del rol
 * indicado (para alternar entre cocinero, mozo y gerente).
 */
function identidadDePrueba(string $rol): void
{
    app('auth')->forgetGuards();

    Sanctum::actingAs(Usuario::factory()->create([
        'rol_id' => Rol::where('nombre', $rol)->first()->id,
    ]));
}

/**
 * Crea una mesa con un plato y deja un pedido recién ENVIADO a
 * cocina (alta, confirmación y envío con identidad de mozo).
 * Devuelve el id del pedido.
 */
function pedidoEnviado(TestCase $test): int
{
    identidadDePrueba('Mozo');

    $mesa = Mesa::factory()->create();
    $plato = Plato::factory()->create(['precio' => 1000]);

    $pedidoId = $test->postJson("/api/mesas/{$mesa->id}/pedidos", [
        'platos' => [['plato_id' => $plato->id, 'cantidad' => 1]],
    ])->assertStatus(201)->json('pedido.id');

    $test->postJson("/api/pedidos/{$pedidoId}/confirmar")->assertOk();
    $test->postJson("/api/pedidos/{$pedidoId}/enviar")->assertOk();

    return $pedidoId;
}

test('la cola muestra los pedidos enviados y en preparacion, con lineas y mesa', function () {
    $a = pedidoEnviado($this); // por preparar
    $b = pedidoEnviado($this); // en cocción
    $c = pedidoEnviado($this); // lo dejamos listo
    $d = pedidoEnviado($this); // lo cancelamos

    // El mozo cancela el último (sigue con identidad de mozo).
    $this->putJson("/api/pedidos/{$d}/estado", ['estado' => 'cancelado'])->assertOk();

    // Cocina: B entra en preparación y C se retira (queda listo).
    conCocina($this, tokenCocina())
        ->putJson("/api/cocina/pedidos/{$b}/estado", ['estado' => 'en_preparacion'])
        ->assertOk();
    conCocina($this, tokenCocina())
        ->putJson("/api/cocina/pedidos/{$c}/estado", ['estado' => 'en_preparacion'])
        ->assertOk();
    conCocina($this, tokenCocina())
        ->putJson("/api/cocina/pedidos/{$c}/estado", ['estado' => 'listo'])
        ->assertOk();

    $cola = conCocina($this, tokenCocina())
        ->getJson('/api/cocina/pedidos')
        ->assertOk()
        ->json('pedidos');

    expect(collect($cola)->pluck('id')->all())->toBe([$a, $b])
        ->and(collect($cola)->pluck('estado')->all())->toBe(['enviado', 'en_preparacion'])
        ->and($cola[0])->toHaveKeys(['id', 'estado', 'mesa', 'detalles'])
        ->and($cola[0]['detalles'])->toHaveCount(1)
        ->and($cola[0]['detalles'][0])->toHaveKeys(['plato', 'cantidad']);
});

test('cocina avanza de enviado a en_preparacion y luego a listo', function () {
    $pedidoId = pedidoEnviado($this);

    conCocina($this, tokenCocina())
        ->putJson("/api/cocina/pedidos/{$pedidoId}/estado", ['estado' => 'en_preparacion'])
        ->assertOk()
        ->assertJsonPath('pedido.estado', 'en_preparacion');

    expect(Pedido::find($pedidoId)->estado)->toBe('en_preparacion');

    conCocina($this, tokenCocina())
        ->putJson("/api/cocina/pedidos/{$pedidoId}/estado", ['estado' => 'listo'])
        ->assertOk()
        ->assertJsonPath('pedido.estado', 'listo')
        ->assertJsonPath('mensaje', "Pedido ahora esta 'listo'.");

    expect(Pedido::find($pedidoId)->estado)->toBe('listo');
});

test('cocina no puede saltar estados ni usar los del mozo', function () {
    $pedidoId = pedidoEnviado($this);

    // De enviado: ni directo a listo, ni a estados del mozo.
    conCocina($this, tokenCocina())
        ->putJson("/api/cocina/pedidos/{$pedidoId}/estado", ['estado' => 'listo'])
        ->assertStatus(422);
    conCocina($this, tokenCocina())
        ->putJson("/api/cocina/pedidos/{$pedidoId}/estado", ['estado' => 'entregado'])
        ->assertStatus(422);
    conCocina($this, tokenCocina())
        ->putJson("/api/cocina/pedidos/{$pedidoId}/estado", ['estado' => 'cancelado'])
        ->assertStatus(422);

    // Avanza a en_preparacion y desde ahí tampoco salta a entregado.
    conCocina($this, tokenCocina())
        ->putJson("/api/cocina/pedidos/{$pedidoId}/estado", ['estado' => 'en_preparacion'])
        ->assertOk();
    conCocina($this, tokenCocina())
        ->putJson("/api/cocina/pedidos/{$pedidoId}/estado", ['estado' => 'entregado'])
        ->assertStatus(422);

    expect(Pedido::find($pedidoId)->estado)->toBe('en_preparacion');
});

test('el mozo no prepara: entrega y cierra recien con el pedido listo', function () {
    $pedidoId = pedidoEnviado($this);

    // El mozo NO puede marcar la preparación: es de la cocina.
    $this->putJson("/api/pedidos/{$pedidoId}/estado", ['estado' => 'en_preparacion'])
        ->assertStatus(422);
    $this->putJson("/api/pedidos/{$pedidoId}/estado", ['estado' => 'listo'])
        ->assertStatus(422);

    // La cocina lo deja listo...
    conCocina($this, tokenCocina())
        ->putJson("/api/cocina/pedidos/{$pedidoId}/estado", ['estado' => 'en_preparacion'])
        ->assertOk();
    conCocina($this, tokenCocina())
        ->putJson("/api/cocina/pedidos/{$pedidoId}/estado", ['estado' => 'listo'])
        ->assertOk();

    // ...y recién ahí el mozo entrega y cierra.
    identidadDePrueba('Mozo');
    $this->putJson("/api/pedidos/{$pedidoId}/estado", ['estado' => 'entregado'])->assertOk();
    $this->putJson("/api/pedidos/{$pedidoId}/estado", ['estado' => 'cerrado'])->assertOk();

    expect(Pedido::find($pedidoId)->estado)->toBe('cerrado');
});

test('el cancel sigue siendo exclusivo del mozo', function () {
    $pedidoId = pedidoEnviado($this);

    // La cocina no puede cancelar (su endpoint solo admite
    // en_preparacion | listo).
    conCocina($this, tokenCocina())
        ->putJson("/api/cocina/pedidos/{$pedidoId}/estado", ['estado' => 'cancelado'])
        ->assertStatus(422);

    // El mozo sí cancela desde enviado.
    identidadDePrueba('Mozo');
    $this->putJson("/api/pedidos/{$pedidoId}/estado", ['estado' => 'cancelado'])->assertOk();

    expect(Pedido::find($pedidoId)->estado)->toBe('cancelado');
});

test('las rutas de cocina exigen preparar_pedidos', function () {
    $pedidoId = pedidoEnviado($this);

    // Sin identidad: 401 (cola y avance).
    app('auth')->forgetGuards();
    $this->getJson('/api/cocina/pedidos')->assertStatus(401);
    $this->putJson("/api/cocina/pedidos/{$pedidoId}/estado", ['estado' => 'en_preparacion'])
        ->assertStatus(401);

    // El mozo no lo tiene: 403.
    identidadDePrueba('Mozo');
    $this->getJson('/api/cocina/pedidos')->assertStatus(403);
    $this->putJson("/api/cocina/pedidos/{$pedidoId}/estado", ['estado' => 'en_preparacion'])
        ->assertStatus(403);

    // La cocina sí: 200.
    conCocina($this, tokenCocina())->getJson('/api/cocina/pedidos')->assertOk();

    // Gerente lo hereda por 'todos' (la UI no lo usa, pero el API sí).
    identidadDePrueba('Gerente');
    $this->getJson('/api/cocina/pedidos')->assertOk();
});

test('el historial y el dashboard conocen el estado listo', function () {
    $pedidoId = pedidoEnviado($this);
    conCocina($this, tokenCocina())
        ->putJson("/api/cocina/pedidos/{$pedidoId}/estado", ['estado' => 'en_preparacion'])
        ->assertOk();
    conCocina($this, tokenCocina())
        ->putJson("/api/cocina/pedidos/{$pedidoId}/estado", ['estado' => 'listo'])
        ->assertOk();

    $this->seed(ConfigMesaSeeder::class); // el dashboard deriva el aforo
    identidadDePrueba('Gerente');

    // Historial: filtra por listo (y sin filtro solo finalizados).
    $respuesta = $this->getJson('/api/historial/comandas?estado=listo')->assertOk();
    expect($respuesta->json('data'))->toHaveCount(1)
        ->and($respuesta->json('data.0.estado'))->toBe('listo');

    $this->getJson('/api/historial/comandas')->assertOk()->assertJsonPath('total', 0);

    // Dashboard: existe la clave y cuenta el pedido.
    $this->getJson('/api/dashboard')
        ->assertOk()
        ->assertJsonPath('pedidos_por_estado.listo', 1);
});
