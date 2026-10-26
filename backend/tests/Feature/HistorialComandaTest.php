<?php

use App\Models\DetallePedido;
use App\Models\Mesa;
use App\Models\Pedido;
use App\Models\Plato;
use Database\Seeders\PermisoSeeder;
use Database\Seeders\RolSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed([PermisoSeeder::class, RolSeeder::class]);
});

/*
 * HISTORIAL DE COMANDAS (GET /api/historial/comandas, permiso
 * ver_historial_comandas: Gerente y Cocina). La comanda = PEDIDO con
 * sus líneas y su mesa aunque la mesa haya sido destruida. Sin
 * filtro `estado` se listan solo los finalizados.
 *
 * Usa los helpers globales tokenReporte / conReporte (definidos en
 * DashboardTest.php); no se redeclaran acá.
 */

/**
 * Crea un pedido directamente (sin factory ni API) para el historial.
 *
 * @param  array<string, mixed>  $atributos
 */
function comandaHistorial(array $atributos = []): Pedido
{
    return Pedido::create(array_merge([
        'mesa_id' => Mesa::factory()->create()->id,
        'estado' => 'cerrado',
        'total' => 100,
        'fecha' => now()->toDateTimeString(),
    ], $atributos));
}

test('el historial de comandas es visible para Cocina y Gerente', function () {
    conReporte($this, tokenReporte('Cocina'))
        ->getJson('/api/historial/comandas')
        ->assertOk();

    conReporte($this, tokenReporte('Gerente'))
        ->getJson('/api/historial/comandas')
        ->assertOk();
});

test('el historial de comandas es 403 para Mozo', function () {
    conReporte($this, tokenReporte('Mozo'))
        ->getJson('/api/historial/comandas')
        ->assertForbidden();
});

test('sin filtro de estado lista solo los finalizados, mas recientes primero', function () {
    $antiguo = comandaHistorial(['fecha' => now()->subDay()->toDateTimeString()]);
    $recienteCancelado = comandaHistorial(['estado' => 'cancelado']);
    comandaHistorial(['estado' => 'en_curso']);
    comandaHistorial(['estado' => 'entregado']);

    $respuesta = conReporte($this, tokenReporte('Cocina'))
        ->getJson('/api/historial/comandas')
        ->assertOk()
        ->assertJsonPath('total', 2);

    $ids = array_column($respuesta->json('data'), 'id');
    expect($ids)->toBe([$recienteCancelado->id, $antiguo->id]);
});

test('el filtro estado lista tambien los pedidos activos', function () {
    $activo = comandaHistorial(['estado' => 'en_preparacion']);
    comandaHistorial(['estado' => 'cerrado']);

    conReporte($this, tokenReporte('Cocina'))
        ->getJson('/api/historial/comandas?estado=en_preparacion')
        ->assertOk()
        ->assertJsonPath('total', 1)
        ->assertJsonPath('data.0.id', $activo->id)
        ->assertJsonPath('data.0.estado', 'en_preparacion');
});

test('el historial filtra por fecha y por mesa', function () {
    $mesa = Mesa::factory()->create();
    $deLaMesa = comandaHistorial([
        'mesa_id' => $mesa->id,
        'fecha' => now()->subDays(3)->toDateTimeString(),
    ]);
    comandaHistorial(['mesa_id' => $mesa->id]);
    comandaHistorial(['fecha' => now()->subDays(3)->toDateTimeString()]);

    conReporte($this, tokenReporte('Cocina'))
        ->getJson('/api/historial/comandas?mesa_id='.$mesa->id)
        ->assertOk()
        ->assertJsonPath('total', 2);

    conReporte($this, tokenReporte('Cocina'))
        ->getJson('/api/historial/comandas?mesa_id='.$mesa->id
            .'&desde='.now()->subDays(3)->toDateString()
            .'&hasta='.now()->subDays(3)->toDateString())
        ->assertOk()
        ->assertJsonPath('total', 1)
        ->assertJsonPath('data.0.id', $deLaMesa->id);
});

test('el historial pagina con per_page y page', function () {
    foreach (range(1, 5) as $i) {
        comandaHistorial();
    }

    conReporte($this, tokenReporte('Cocina'))
        ->getJson('/api/historial/comandas?per_page=2&page=2')
        ->assertOk()
        ->assertJsonPath('total', 5)
        ->assertJsonPath('per_page', 2)
        ->assertJsonPath('current_page', 2)
        ->assertJsonCount(2, 'data');
});

test('una comanda conserva su mesa aunque la mesa este destruida', function () {
    $mesa = Mesa::factory()->create(['codigo_acceso' => '123456']);
    $comanda = comandaHistorial(['mesa_id' => $mesa->id]);
    $mesa->delete();

    conReporte($this, tokenReporte('Cocina'))
        ->getJson('/api/historial/comandas')
        ->assertOk()
        ->assertJsonPath('data.0.id', $comanda->id)
        ->assertJsonPath('data.0.mesa.id', $mesa->id)
        ->assertJsonPath('data.0.mesa.codigo_acceso', '123456')
        ->assertJsonPath('data.0.mesa.destruida', true);
});

test('show devuelve la comanda con sus lineas', function () {
    $plato = Plato::factory()->create(['nombre' => 'Milanesa']);
    $comanda = comandaHistorial();
    DetallePedido::create([
        'pedido_id' => $comanda->id,
        'plato_id' => $plato->id,
        'cantidad' => 2,
        'precio_lista' => 50,
        'subtotal' => 100,
        'confirmado' => true,
    ]);

    conReporte($this, tokenReporte('Gerente'))
        ->getJson("/api/historial/comandas/{$comanda->id}")
        ->assertOk()
        ->assertJsonPath('id', $comanda->id)
        ->assertJsonPath('lineas.0.plato', 'Milanesa')
        ->assertJsonPath('lineas.0.cantidad', 2)
        ->assertJsonPath('lineas.0.subtotal', 100)
        ->assertJsonPath('lineas.0.confirmado', true);
});

test('show responde 404 si la comanda no existe', function () {
    conReporte($this, tokenReporte('Gerente'))
        ->getJson('/api/historial/comandas/999999')
        ->assertNotFound()
        ->assertJsonPath('message', 'Comanda no encontrada');
});
