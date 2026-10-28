<?php

use App\Models\Mesa;
use App\Models\Plato;
use App\Models\Rol;
use App\Models\Usuario;
use Database\Seeders\PermisoSeeder;
use Database\Seeders\RolSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Testing\TestResponse;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

uses(RefreshDatabase::class);

beforeEach(function () {
    // Permisos (ROL_PERMISO) y roles, como en producción.
    $this->seed([PermisoSeeder::class, RolSeeder::class]);
});

/*
 * Comensal sin CLIENTE ni tokens (rebote 2 de los profes):
 *  - entra con el codigo_acceso de la mesa (POST /api/acceso) y lo
 *    manda en cada request como Authorization: Bearer <codigo>;
 *  - su identidad en la visita es el PEDIDO que creó, que el front
 *    guarda en el localStorage (pedido_id / pedido_padre_id);
 *  - las líneas nacen confirmado=false en DETALLE_PEDIDO (gate).
 *
 * OJO: los helpers globales autenticarMozo/platoDePrueba viven en
 * PedidoMesaTest — no redeclararlos acá (colisionan en toda la suite).
 */

/**
 * Mesa viva con su codigo_acceso de 4 dígitos (lo reparte el mozo).
 */
function mesaVisita(): Mesa
{
    return Mesa::factory()->create();
}

/**
 * Plato simple para el auto-pedido (sin ingredientes).
 */
function platoAuto(float $precio = 1000): Plato
{
    return Plato::factory()->create(['precio' => $precio]);
}

/**
 * Token real de un mozo (rol con el permiso tomar_pedidos).
 */
function tokenMozo(): string
{
    $mozo = Usuario::factory()->create([
        'rol_id' => Rol::where('nombre', 'Mozo')->first()->id,
    ]);

    return $mozo->createToken('mozo')->plainTextToken;
}

/**
 * Resetea la identidad cacheada del guard y devuelve el TestCase con
 * el token del mozo puesto.
 */
function conMozo(TestCase $test, string $token): TestCase
{
    app('auth')->forgetGuards();

    return $test->withToken($token);
}

/**
 * Request del comensal: Bearer = codigo_acceso de la mesa.
 */
function comensal(TestCase $test, string $codigo): TestCase
{
    return $test->withHeader('Authorization', 'Bearer '.$codigo);
}

/**
 * Línea de pedido del comensal (POST /cliente/pedidos).
 *
 * @param  array<string, mixed>  $extra
 */
function pedirLineaCliente(
    TestCase $test,
    string $codigo,
    Plato $plato,
    int $cantidad = 1,
    array $extra = [],
): TestResponse {
    return comensal($test, $codigo)->postJson('/api/cliente/pedidos', array_merge([
        'platos' => [['plato_id' => $plato->id, 'cantidad' => $cantidad]],
    ], $extra));
}

test('el acceso valida el codigo y devuelve la mesa', function () {
    $mesa = mesaVisita();

    $this->postJson('/api/acceso', ['codigo' => $mesa->codigo_acceso])
        ->assertOk()
        ->assertJsonPath('mesa.id', $mesa->id)
        ->assertJsonPath('mesa.codigo_acceso', $mesa->codigo_acceso);

    // Código que no corresponde a ninguna mesa.
    $this->postJson('/api/acceso', ['codigo' => '0000'])->assertStatus(401);

    // Destruída la mesa, su código deja de valer.
    $mesa->destruir();
    $this->postJson('/api/acceso', ['codigo' => $mesa->codigo_acceso])->assertStatus(401);
});

test('sin codigo no se entra a las rutas del comensal', function () {
    $this->getJson('/api/cliente/pedidos')->assertUnauthorized();
    $this->getJson('/api/cliente/cuenta')->assertUnauthorized();
    $this->postJson('/api/cliente/pedidos', [])->assertUnauthorized();
});

test('un token de empleado no pasa el middleware del comensal', function () {
    conMozo($this, tokenMozo())
        ->getJson('/api/cliente/pedidos')
        ->assertForbidden()
        ->assertJsonPath('message', 'Solo los clientes pueden acceder.');
});

test('el comensal crea su pedido raiz con lineas sin confirmar', function () {
    $mesa = mesaVisita();
    $codigo = $mesa->codigo_acceso;

    pedirLineaCliente($this, $codigo, platoAuto(1000), 2)
        ->assertStatus(201)
        ->assertJsonPath('pedido.pedido_padre_id', null)
        ->assertJsonPath('pedido.estado', 'en_curso');

    // La mesa pasa a 'ocupada' con el primer pedido.
    expect($mesa->fresh()->estado)->toBe('ocupada');

    // Gate por línea: nacen en confirmado = false.
    $pedido = $mesa->pedidos()->first();
    expect($pedido->detalles)->toHaveCount(1)
        ->and((bool) $pedido->detalles->first()->confirmado)->toBeFalse();
});

test('la repeticion cuelga de la primer orden (arbol de pedidos)', function () {
    $mesa = mesaVisita();
    $codigo = $mesa->codigo_acceso;
    $plato = platoAuto();

    // Primera orden: raíz.
    $raizId = pedirLineaCliente($this, $codigo, $plato)
        ->assertStatus(201)
        ->json('pedido.id');

    // La raíz sigue en curso: no se crea un hijo, hay que agrandarla.
    pedirLineaCliente($this, $codigo, $plato, 1, ['pedido_padre_id' => $raizId])
        ->assertStatus(422);

    // El mozo confirma la raíz (no es estado final: la mesa sigue).
    conMozo($this, tokenMozo())
        ->postJson("/api/pedidos/{$raizId}/confirmar", ['forzar' => true])
        ->assertOk();

    // Ahora sí: la segunda orden queda colgada de la raíz.
    $hijo = pedirLineaCliente($this, $codigo, $plato, 1, ['pedido_padre_id' => $raizId])
        ->assertStatus(201);
    expect($hijo->json('pedido.pedido_padre_id'))->toBe($raizId);
    expect($mesa->pedidos()->count())->toBe(2);

    // Un hijo no puede ser padre (profundidad 2).
    pedirLineaCliente($this, $codigo, $plato, 1, ['pedido_padre_id' => $hijo->json('pedido.id')])
        ->assertStatus(422);

    // El pedido_id/raíz tiene que ser de la MISMA mesa.
    $ajeno = Mesa::factory()->create();
    $pedidoAjeno = $ajeno->pedidos()->create([
        'estado' => 'en_curso',
        'total' => 100,
        'fecha' => now(),
    ]);
    pedirLineaCliente($this, $codigo, $plato, 1, ['pedido_id' => $pedidoAjeno->id])
        ->assertStatus(422);
});

test('el comensal confirma y desconfirma las lineas de su pedido', function () {
    $mesa = mesaVisita();
    $codigo = $mesa->codigo_acceso;
    $plato = platoAuto();

    // 2 líneas: con una sola sin confirmar el pedido NO se auto-envía,
    // así dá tiempo a deshacer antes de que salga a cocina.
    $pedidoId = pedirLineaCliente($this, $codigo, $plato, 1, [
        'platos' => [
            ['plato_id' => $plato->id, 'cantidad' => 1],
            ['plato_id' => $plato->id, 'cantidad' => 1],
        ],
    ])->assertStatus(201)->json('pedido.id');

    $detalles = DB::table('detalle_pedidos')->where('pedido_id', $pedidoId)->pluck('id');
    $detalleId = $detalles[0];

    comensal($this, $codigo)->postJson('/api/cliente/pedidos/confirmar', [
        'pedido_id' => $pedidoId,
        'detalle_ids' => [$detalleId],
    ])->assertOk()->assertJsonPath('pedido.estado', 'en_curso');

    expect((bool) DB::table('detalle_pedidos')->where('id', $detalleId)->value('confirmado'))->toBeTrue();

    // Deshace solo esa línea: el pedido sigue en_curso (falta la otra).
    comensal($this, $codigo)->postJson('/api/cliente/pedidos/desconfirmar', [
        'pedido_id' => $pedidoId,
        'detalle_ids' => [$detalleId],
    ])->assertOk()->assertJsonPath('pedido.estado', 'en_curso');

    expect((bool) DB::table('detalle_pedidos')->where('id', $detalleId)->value('confirmado'))->toBeFalse();

    // Sin pedido_id no sabe cuáles son "sus" líneas.
    comensal($this, $codigo)->postJson('/api/cliente/pedidos/confirmar', [])
        ->assertStatus(422);
});

test('cuando el unico pedido de la mesa queda confirmado sale a cocina', function () {
    $mesa = mesaVisita();
    $codigo = $mesa->codigo_acceso;
    $plato = platoAuto();

    // Pide 2 líneas separadas en un solo request (dos platos).
    $pedidoId = pedirLineaCliente($this, $codigo, $plato, 1, [
        'platos' => [
            ['plato_id' => $plato->id, 'cantidad' => 1],
            ['plato_id' => $plato->id, 'cantidad' => 1],
        ],
    ])->assertStatus(201)->json('pedido.id');

    $lineas = DB::table('detalle_pedidos')
        ->where('pedido_id', $pedidoId)
        ->pluck('id')
        ->all();
    expect($lineas)->toHaveCount(2);

    // Confirma 1 sola línea → sigue en_curso (falta la otra).
    comensal($this, $codigo)->postJson('/api/cliente/pedidos/confirmar', [
        'pedido_id' => $pedidoId,
        'detalle_ids' => [$lineas[0]],
    ])->assertOk()->assertJsonPath('pedido.estado', 'en_curso');

    // Confirma la última → como es el único pedido de la mesa, sale a cocina.
    comensal($this, $codigo)->postJson('/api/cliente/pedidos/confirmar', [
        'pedido_id' => $pedidoId,
        'detalle_ids' => [$lineas[1]],
    ])->assertOk()->assertJsonPath('pedido.estado', 'enviado');

    // El mozo ya no puede retomar el flujo manual sobre un pedido enviado.
    $mzo = tokenMozo();
    conMozo($this, $mzo)->postJson("/api/pedidos/{$pedidoId}/confirmar")->assertStatus(422);
    conMozo($this, $mzo)->postJson("/api/pedidos/{$pedidoId}/enviar")->assertStatus(422);
});

test('cuando todos los pedidos de la mesa estan confirmados salen juntos a cocina', function () {
    $mesa = mesaVisita();
    $codigo = $mesa->codigo_acceso;
    $plato = platoAuto();

    // Ana y Beto: cada uno su pedido (raíz) en la misma mesa.
    $anaId = pedirLineaCliente($this, $codigo, $plato)
        ->assertStatus(201)->json('pedido.id');
    $betoId = pedirLineaCliente($this, $codigo, $plato)
        ->assertStatus(201)->json('pedido.id');
    expect($anaId)->not->toBe($betoId);

    // Ana confirma todas las suyas → NO sale nada: Beto sigue sin confirmar.
    comensal($this, $codigo)->postJson('/api/cliente/pedidos/confirmar', [
        'pedido_id' => $anaId,
    ])->assertOk()->assertJsonPath('pedido.estado', 'en_curso');

    expect((int) DB::table('pedidos')->where('estado', 'enviado')->count())->toBe(0);

    // Beto confirma las suyas → salen JUNTOS los dos a cocina.
    comensal($this, $codigo)->postJson('/api/cliente/pedidos/confirmar', [
        'pedido_id' => $betoId,
    ])->assertOk()->assertJsonPath('pedido.estado', 'enviado');

    expect((int) DB::table('pedidos')->where('estado', 'enviado')->count())->toBe(2)
        ->and(DB::table('pedidos')->whereIn('id', [$anaId, $betoId])->pluck('estado')->unique()->all())
        ->toBe(['enviado']);
});

test('un pedido ya enviado no admite desconfirmar lineas', function () {
    $mesa = mesaVisita();
    $codigo = $mesa->codigo_acceso;
    $pedidoId = pedirLineaCliente($this, $codigo, platoAuto())
        ->assertStatus(201)
        ->json('pedido.id');

    // Confirmar y deshacer: vuelve a en_curso y no se envía.
    comensal($this, $codigo)->postJson('/api/cliente/pedidos/confirmar', [
        'pedido_id' => $pedidoId,
    ])->assertOk()->assertJsonPath('pedido.estado', 'enviado');

    // Un pedido enviado ya no admite desconfirmar (solo en_curso):
    // el deshacer solo aplica antes del envío.
    comensal($this, $codigo)->postJson('/api/cliente/pedidos/desconfirmar', [
        'pedido_id' => $pedidoId,
    ])->assertStatus(422);
});

test('el mozo puede forzar la confirmacion con lineas sin confirmar', function () {
    $mesa = mesaVisita();
    $codigo = $mesa->codigo_acceso;
    $pedidoId = pedirLineaCliente($this, $codigo, platoAuto())
        ->assertStatus(201)
        ->json('pedido.id');

    conMozo($this, tokenMozo())->postJson("/api/pedidos/{$pedidoId}/confirmar", ['forzar' => true])
        ->assertOk()
        ->assertJsonPath('pedido.estado', 'confirmado');
});

test('un pedido solo de lineas del mozo confirma sin ninguna confirmacion previa', function () {
    $mesa = Mesa::factory()->create();
    $plato = platoAuto();

    conMozo($this, tokenMozo())->postJson("/api/mesas/{$mesa->id}/pedidos", [
        'platos' => [['plato_id' => $plato->id, 'cantidad' => 1]],
    ])->assertStatus(201);

    $pedido = $mesa->pedidos()->first();

    // Líneas del mozo nacen confirmadas: el gate pasa solo.
    conMozo($this, tokenMozo())->postJson("/api/pedidos/{$pedido->id}/confirmar")
        ->assertOk()
        ->assertJsonPath('pedido.estado', 'confirmado');

    conMozo($this, tokenMozo())->postJson("/api/pedidos/{$pedido->id}/enviar")->assertOk();
});

test('la cuenta reparte las lineas en partes por pedido raiz', function () {
    $mesa = mesaVisita();
    $codigo = $mesa->codigo_acceso;

    // Ana pide 1000 (su raíz) y Beto 3000 (la suya).
    $raizAna = pedirLineaCliente($this, $codigo, platoAuto(1000))
        ->assertStatus(201)
        ->json('pedido.id');
    $raizBeto = pedirLineaCliente($this, $codigo, platoAuto(3000))
        ->assertStatus(201)
        ->json('pedido.id');

    // El mozo agrega una orden más (raíz suya): tercera parte.
    conMozo($this, tokenMozo())->postJson("/api/mesas/{$mesa->id}/pedidos", [
        'platos' => [['plato_id' => platoAuto(500)->id, 'cantidad' => 1]],
    ])->assertStatus(201);

    $cuenta = comensal($this, $codigo)->getJson('/api/cliente/cuenta')->assertOk()->json();

    expect($cuenta['partes'])->toHaveCount(3)
        ->and((float) $cuenta['total'])->toBe(4500.0);

    $porPedido = collect($cuenta['partes'])->keyBy('pedido_id');
    expect((float) $porPedido[$raizAna]['subtotal'])->toBe(1000.0)
        ->and((float) $porPedido[$raizBeto]['subtotal'])->toBe(3000.0);

    // Cancelada la raíz de Beto: queda fuera de la cuenta (y la mesa
    // no se toca: lo que termina la visita es el pago, no un pedido).
    conMozo($this, tokenMozo())
        ->putJson("/api/pedidos/{$raizBeto}/estado", ['estado' => 'cancelado'])
        ->assertOk();

    $cuenta = comensal($this, $codigo)->getJson('/api/cliente/cuenta')->assertOk()->json();
    expect($cuenta['partes'])->toHaveCount(2)
        ->and((float) $cuenta['total'])->toBe(1500.0);
});

test('la cuenta corta por ocupada_desde y sigue tras destruir la mesa', function () {
    $mesa = mesaVisita();

    // Pedido de la visita ANTERIOR (antes de ocupar): queda fuera.
    $pedidoViejo = $mesa->pedidos()->create([
        'estado' => 'cerrado',
        'total' => 999,
        'fecha' => now()->subHour(),
    ]);

    $codigo = $mesa->codigo_acceso;
    $pedidoId = pedirLineaCliente($this, $codigo, platoAuto(800))
        ->assertStatus(201)
        ->json('pedido.id');

    $cuenta = comensal($this, $codigo)->getJson('/api/cliente/cuenta')->assertOk()->json();
    expect((float) $cuenta['total'])->toBe(800.0)
        ->and(collect($cuenta['partes'])->pluck('pedido_id'))->not->toContain($pedidoViejo->id);

    // El mozo lo envía a cocina...
    $mzo = tokenMozo();
    conMozo($this, $mzo)->postJson("/api/pedidos/{$pedidoId}/confirmar", ['forzar' => true])->assertOk();
    conMozo($this, $mzo)->postJson("/api/pedidos/{$pedidoId}/enviar")->assertOk();

    // ...cocina lo prepara y lo deja listo (preparar_pedidos)...
    foreach (['en_preparacion', 'listo'] as $estado) {
        conCocina($this, tokenCocina())
            ->putJson("/api/cocina/pedidos/{$pedidoId}/estado", ['estado' => $estado])
            ->assertOk();
    }

    // ...y el mozo lo entrega y lo cierra: la mesa NO se destruye
    // sola, la visita sigue hasta el pago.
    conMozo($this, $mzo)->putJson("/api/pedidos/{$pedidoId}/estado", ['estado' => 'entregado'])->assertOk();
    conMozo($this, $mzo)->putJson("/api/pedidos/{$pedidoId}/estado", ['estado' => 'cerrado'])->assertOk();

    // El pedido quedó finalizado pero el código SIGUE valiendo: la
    // visita no terminó hasta que el cliente pague.
    comensal($this, $codigo)->getJson('/api/cliente/pedidos')->assertOk();

    // Pagó: el mozo cierra la visita y recién ahí la mesa queda
    // DESTRUIDA (borrado lógico); los pedidos siguen existiendo.
    conMozo($this, $mzo)->postJson("/api/mesas/{$mesa->id}/cerrar")->assertOk();

    expect(Mesa::find($mesa->id))->toBeNull();

    // El código ya no abre el resumen... el comensal queda afuera.
    comensal($this, $codigo)->getJson('/api/cliente/pedidos')->assertUnauthorized();

    // ...pero la cuenta de la visita terminada sigue disponible para
    // el empleado (la mesa se lee con trashed; lo cerrado se cobra).
    $cuentaFinal = conMozo($this, tokenMozo())
        ->getJson("/api/mesas/{$mesa->id}/cuenta")
        ->assertOk()
        ->json();
    expect((float) $cuentaFinal['total'])->toBe(800.0);

    // El pedido viejo sigue existiendo: solo lo filtra la cuenta.
    expect($mesa->pedidos()->whereKey($pedidoViejo->id)->exists())->toBeTrue();
});

test('ocupar y agrupar NO regeneran el codigo de acceso', function () {
    $mesaA = mesaVisita();
    $mesaB = mesaVisita();
    $codigo = $mesaA->codigo_acceso;
    $mzo = tokenMozo();

    // Ocupar: el código es estable (no hay re-login).
    conMozo($this, $mzo)->postJson("/api/mesas/{$mesaA->id}/ocupar")
        ->assertOk()
        ->assertJsonPath('codigo_acceso', $codigo);
    comensal($this, $codigo)->getJson('/api/cliente/pedidos')->assertOk();

    // Agrupar: tampoco cambian los códigos (las dos, ocupadas).
    conMozo($this, $mzo)->postJson("/api/mesas/{$mesaB->id}/ocupar")->assertOk();
    conMozo($this, $mzo)->postJson('/api/mesas/agrupar', [
        'mesa_ids' => [$mesaA->id, $mesaB->id],
    ])->assertOk()->assertJsonStructure(['grupo_codigo', 'mesas', 'codigos_acceso']);

    comensal($this, $codigo)->getJson('/api/cliente/pedidos')
        ->assertOk()
        ->assertJsonPath('grupo.0.mesa_id', $mesaB->id);

    // Desagrupar: el resumen ya no trae grupo.
    conMozo($this, $mzo)->postJson('/api/mesas/desagrupar', ['mesa_ids' => [$mesaA->id]])
        ->assertOk();

    comensal($this, $codigo)->getJson('/api/cliente/pedidos')
        ->assertOk()
        ->assertJsonMissingPath('grupo');
});

test('el comensal no puede usar las rutas del mozo', function () {
    $mesa = mesaVisita();
    $codigo = $mesa->codigo_acceso;

    $pedidoId = pedirLineaCliente($this, $codigo, platoAuto())
        ->assertStatus(201)
        ->json('pedido.id');

    // Su codigo no es un token de empleado: las rutas con permisos
    // responden 401 (nunca pasan auth:sanctum).
    comensal($this, $codigo)->postJson("/api/pedidos/{$pedidoId}/confirmar")->assertUnauthorized();
    comensal($this, $codigo)->postJson("/api/pedidos/{$pedidoId}/enviar")->assertUnauthorized();
});
