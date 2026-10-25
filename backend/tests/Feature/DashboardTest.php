<?php

use App\Models\DetallePedido;
use App\Models\Mesa;
use App\Models\Pedido;
use App\Models\Plato;
use App\Models\Reserva;
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
 * DASHBOARD de estadísticas (GET /api/dashboard, permiso ver_dashboard).
 * Ventas del período (entregado + cerrado), pedidos por estado, platos
 * más vendidos, ocupación actual y reservas de hoy.
 *
 * OJO: helpers globales ya definidos en otros tests (tokenEmpleado,
 * conEmpleado, fijarAforo, aforoReserva, tokenConfig…) no se
 * redeclaran acá.
 */

/**
 * Token de un empleado del rol indicado.
 */
function tokenReporte(string $rol): string
{
    $usuario = Usuario::factory()->create([
        'rol_id' => Rol::where('nombre', $rol)->first()->id,
    ]);

    return $usuario->createToken($rol)->plainTextToken;
}

/**
 * Resetea la identidad cacheada del guard y pone el token.
 */
function conReporte(TestCase $test, string $token): TestCase
{
    app('auth')->forgetGuards();

    return $test->withToken($token);
}

/**
 * Crea un pedido directamente (sin factory ni API) para alimentar
 * los agregados del dashboard.
 *
 * @param  array<string, mixed>  $atributos
 */
function pedidoDashboard(array $atributos = []): Pedido
{
    return Pedido::create(array_merge([
        'mesa_id' => Mesa::factory()->create()->id,
        'estado' => 'cerrado',
        'total' => 100,
        'fecha' => now()->toDateTimeString(),
    ], $atributos));
}

test('el dashboard exige token y el permiso ver_dashboard', function () {
    $this->getJson('/api/dashboard')->assertUnauthorized();

    conReporte($this, tokenReporte('Mozo'))
        ->getJson('/api/dashboard')
        ->assertForbidden();

    conReporte($this, tokenReporte('Cocina'))
        ->getJson('/api/dashboard')
        ->assertForbidden();
});

test('el dashboard devuelve el shape completo con los 7 estados en 0', function () {
    $this->seed(ConfigMesaSeeder::class);

    $respuesta = conReporte($this, tokenReporte('Gerente'))
        ->getJson('/api/dashboard')
        ->assertOk()
        ->assertJsonStructure([
            'periodo' => ['desde', 'hasta'],
            'ventas' => ['cantidad_pedidos', 'total', 'ticket_promedio'],
            'pedidos_por_estado',
            'platos_mas_vendidos',
            'ocupacion_actual' => [
                'mesas' => ['libres', 'ocupadas', 'reservadas', 'total'],
                'cubiertos_ocupados',
                'aforo',
                'porcentaje_aforo',
            ],
            'reservas_hoy',
        ])
        ->assertJsonPath('ventas.cantidad_pedidos', 0)
        ->assertJsonPath('ventas.total', 0)
        ->assertJsonPath('ventas.ticket_promedio', 0)
        ->assertJsonPath('ocupacion_actual.aforo', 100)
        ->assertJsonPath('ocupacion_actual.mesas.total', 0)
        ->assertJsonPath('reservas_hoy.fecha', now()->toDateString());

    $estados = $respuesta->json('pedidos_por_estado');
    expect(array_keys($estados))->toBe([
        'en_curso', 'confirmado', 'enviado', 'en_preparacion',
        'listo', 'entregado', 'cerrado', 'cancelado',
    ])->and(array_values(array_unique($estados)))->toBe([0]);
});

test('las ventas del periodo solo cuentan entregado y cerrado', function () {
    pedidoDashboard(['estado' => 'cerrado', 'total' => 100]);
    pedidoDashboard(['estado' => 'entregado', 'total' => 200]);
    pedidoDashboard(['estado' => 'en_curso', 'total' => 999]);
    pedidoDashboard(['estado' => 'cancelado', 'total' => 999]);

    conReporte($this, tokenReporte('Gerente'))
        ->getJson('/api/dashboard')
        ->assertOk()
        ->assertJsonPath('ventas.cantidad_pedidos', 2)
        ->assertJsonPath('ventas.total', 300)
        ->assertJsonPath('ventas.ticket_promedio', 150)
        ->assertJsonPath('pedidos_por_estado.en_curso', 1)
        ->assertJsonPath('pedidos_por_estado.cerrado', 1)
        ->assertJsonPath('pedidos_por_estado.cancelado', 1);
});

test('las ventas del periodo excluyen los pedidos fuera del rango', function () {
    pedidoDashboard(['fecha' => now()->subDays(2)->toDateTimeString()]);
    pedidoDashboard();

    conReporte($this, tokenReporte('Gerente'))
        ->getJson('/api/dashboard?desde='.now()->toDateString())
        ->assertOk()
        ->assertJsonPath('ventas.cantidad_pedidos', 1)
        ->assertJsonPath('ventas.total', 100)
        ->assertJsonPath('periodo.desde', now()->toDateString());
});

test('el dashboard rechaza un periodo incoherente o demasiado largo', function () {
    $gerente = conReporte($this, tokenReporte('Gerente'));

    $gerente->getJson('/api/dashboard?desde='.now()->toDateString()
        .'&hasta='.now()->subDay()->toDateString())
        ->assertStatus(422);

    $gerente->getJson('/api/dashboard?desde='.now()->subYears(2)->toDateString())
        ->assertStatus(422);
});

test('la ocupacion actual cuenta mesas por estado y contra el aforo', function () {
    $this->seed(ConfigMesaSeeder::class);

    Mesa::factory()->create(['capacidad' => 4]);
    Mesa::factory()->create(['capacidad' => 6]);
    Mesa::factory()->create(['capacidad' => 4, 'estado' => 'ocupada']);

    conReporte($this, tokenReporte('Gerente'))
        ->getJson('/api/dashboard')
        ->assertOk()
        ->assertJsonPath('ocupacion_actual.mesas.libres', 2)
        ->assertJsonPath('ocupacion_actual.mesas.ocupadas', 1)
        ->assertJsonPath('ocupacion_actual.mesas.reservadas', 0)
        ->assertJsonPath('ocupacion_actual.mesas.total', 3)
        ->assertJsonPath('ocupacion_actual.cubiertos_ocupados', 14)
        ->assertJsonPath('ocupacion_actual.aforo', 100)
        ->assertJsonPath('ocupacion_actual.porcentaje_aforo', 14);
});

test('los platos mas vendidos se ordenan por unidades desc con sus subtotales', function () {
    $milanesa = Plato::factory()->create(['nombre' => 'Milanesa napolitana']);
    $empanadas = Plato::factory()->create(['nombre' => 'Empanadas']);

    $pedido = pedidoDashboard(['total' => 35200]);
    DetallePedido::create([
        'pedido_id' => $pedido->id,
        'plato_id' => $milanesa->id,
        'cantidad' => 4,
        'precio_lista' => 1600,
        'subtotal' => 6400,
        'confirmado' => true,
    ]);
    DetallePedido::create([
        'pedido_id' => $pedido->id,
        'plato_id' => $empanadas->id,
        'cantidad' => 10,
        'precio_lista' => 1200,
        'subtotal' => 12000,
        'confirmado' => true,
    ]);

    // Una línea de un pedido activo NO cuenta como venta.
    $activo = pedidoDashboard(['estado' => 'en_curso', 'total' => 0]);
    DetallePedido::create([
        'pedido_id' => $activo->id,
        'plato_id' => $milanesa->id,
        'cantidad' => 99,
        'precio_lista' => 1600,
        'subtotal' => 99999,
        'confirmado' => true,
    ]);

    $respuesta = conReporte($this, tokenReporte('Gerente'))
        ->getJson('/api/dashboard')
        ->assertOk();

    $top = $respuesta->json('platos_mas_vendidos');
    expect($top)->toHaveCount(2)
        ->and($top[0]['nombre'])->toBe('Empanadas')
        ->and($top[0]['unidades'])->toBe(10)
        ->and($top[0]['total'])->toBe(12000)
        ->and($top[1]['nombre'])->toBe('Milanesa napolitana')
        ->and($top[1]['unidades'])->toBe(4)
        ->and($top[1]['total'])->toBe(6400);
});

test('reservas_hoy solo cuenta las de hoy y suma personas de pendientes', function () {
    Reserva::factory()->create(['fecha' => now()->toDateString(), 'cantPersonas' => 3]);
    Reserva::factory()->create(['fecha' => now()->toDateString(), 'cantPersonas' => 2]);
    Reserva::factory()->create(['fecha' => now()->toDateString(), 'estado' => 'finalizada']);
    Reserva::factory()->create(['fecha' => now()->addDay()->toDateString()]);

    conReporte($this, tokenReporte('Gerente'))
        ->getJson('/api/dashboard')
        ->assertOk()
        ->assertJsonPath('reservas_hoy.fecha', now()->toDateString())
        ->assertJsonPath('reservas_hoy.pendientes', 2)
        ->assertJsonPath('reservas_hoy.finalizadas', 1)
        ->assertJsonPath('reservas_hoy.canceladas', 0)
        ->assertJsonPath('reservas_hoy.no_asistio', 0)
        ->assertJsonPath('reservas_hoy.total_personas_pendientes', 5);
});
