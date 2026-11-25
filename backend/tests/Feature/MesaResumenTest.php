<?php

use App\Models\DetallePedido;
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
    $this->seed([PermisoSeeder::class, RolSeeder::class]);
});

/*
 * RESUMEN POR MESA en GET /api/mesas (Diseño 2.0): cada mesa viaja con
 * su `resumen` {estado_pedido, platos, total} calculado por lote (una
 * consulta agrupada, sin N+1).
 *
 * Helpers propios (nombres únicos): así el archivo corre aislado sin
 * depender de MesaDinamicaTest.php.
 */

/**
 * Token de un empleado del rol indicado.
 */
function tokenMesaResumen(string $rol): string
{
    $usuario = Usuario::factory()->create([
        'rol_id' => Rol::where('nombre', $rol)->first()->id,
    ]);

    return $usuario->createToken($rol)->plainTextToken;
}

/**
 * Resetea la identidad cacheada del guard y pone el token.
 */
function conMesaResumen(TestCase $test, string $token): TestCase
{
    app('auth')->forgetGuards();

    return $test->withToken($token);
}

/**
 * Pedido de la visita con una sola línea de unidades/subtotal fijos.
 */
function pedidoResumen(Mesa $mesa, string $estado, int $cantidad, float $subtotal): void
{
    $pedido = Pedido::create([
        'mesa_id' => $mesa->id,
        'estado' => $estado,
        'total' => $subtotal,
        'fecha' => now()->toDateTimeString(),
    ]);

    DetallePedido::create([
        'pedido_id' => $pedido->id,
        'plato_id' => Plato::factory()->create()->id,
        'cantidad' => $cantidad,
        'precio_lista' => $subtotal / $cantidad,
        'subtotal' => $subtotal,
        'confirmado' => true,
    ]);
}

test('GET /mesas agrega el resumen de la visita con estado, platos y total', function () {
    $mesa = Mesa::factory()->create();
    pedidoResumen($mesa, 'entregado', 2, 1000);
    pedidoResumen($mesa, 'entregado', 3, 1500);

    $respuesta = conMesaResumen($this, tokenMesaResumen('Mozo'))
        ->getJson('/api/mesas')
        ->assertOk();

    $porId = collect($respuesta->json())->keyBy('id');
    $resumen = $porId[$mesa->id]['resumen'];

    expect($resumen['estado_pedido'])->toBe('servido')
        ->and($resumen['platos'])->toBe(5)
        ->and($resumen['total'])->toEqual(2500);
});

test('el estado de la visita sigue la precedencia de sus pedidos', function () {
    $casos = [
        [[], 'eligiendo'],
        [['en_curso'], 'eligiendo'],
        [['confirmado'], 'eligiendo'],
        [['enviado'], 'en_cocina'],
        [['en_preparacion'], 'en_cocina'],
        [['listo'], 'listo'],
        [['entregado'], 'servido'],
        [['cancelado'], 'eligiendo'],
        [['listo', 'enviado'], 'en_cocina'],
        [['listo', 'entregado'], 'listo'],
    ];

    $esperado = [];
    foreach ($casos as [$estados, $estadoEsperado]) {
        $mesa = Mesa::factory()->create();
        foreach ($estados as $estado) {
            pedidoResumen($mesa, $estado, 1, 100);
        }
        $esperado[$mesa->id] = $estadoEsperado;
    }

    $respuesta = conMesaResumen($this, tokenMesaResumen('Mozo'))
        ->getJson('/api/mesas')
        ->assertOk();

    $porId = collect($respuesta->json())->keyBy('id');

    foreach ($esperado as $id => $estadoEsperado) {
        expect($porId[$id]['resumen']['estado_pedido'])->toBe($estadoEsperado);
    }
});

test('el resumen excluye los pedidos cancelados del total y de las unidades', function () {
    $mesa = Mesa::factory()->create();
    pedidoResumen($mesa, 'entregado', 2, 1000);
    pedidoResumen($mesa, 'cancelado', 5, 9999);

    $respuesta = conMesaResumen($this, tokenMesaResumen('Mozo'))
        ->getJson('/api/mesas')
        ->assertOk();

    $porId = collect($respuesta->json())->keyBy('id');
    $resumen = $porId[$mesa->id]['resumen'];

    expect($resumen['platos'])->toBe(2)
        ->and($resumen['total'])->toEqual(1000);
});
