<?php

use App\Models\DetallePedido;
use App\Models\Mesa;
use App\Models\Pago;
use App\Models\Pedido;
use App\Models\Plato;
use App\Models\Rol;
use App\Models\Usuario;
use Database\Seeders\PermisoSeeder;
use Database\Seeders\RolSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed([PermisoSeeder::class, RolSeeder::class]);
});

/*
|--------------------------------------------------------------------------
| Helpers propios (prefijo `pago`, no redeclaran los globales)
|--------------------------------------------------------------------------
*/

/** Habilita el módulo MP (token + secreto de firma) en config. */
function pagoHabilitar(string $token = 'TEST-123'): void
{
    config([
        'services.mercadopago.enabled' => true,
        'services.mercadopago.access_token' => $token,
        'services.mercadopago.webhook_secret' => 'secreto-webhook',
        'services.mercadopago.app_url' => 'http://localhost:8000',
    ]);
}

/** Apaga el módulo MP (sin credenciales). */
function pagoDeshabilitar(): void
{
    config([
        'services.mercadopago.enabled' => true,
        'services.mercadopago.access_token' => null,
        'services.mercadopago.webhook_secret' => null,
    ]);
}

/** Mesa viva con su codigo_acceso de 4 dígitos. */
function pagoMesa(): Mesa
{
    return Mesa::factory()->create();
}

/** Plato simple para el auto-pedido. */
function pagoPlato(float $precio = 1000): Plato
{
    return Plato::factory()->create(['precio' => $precio]);
}

/** Request del comensal: Bearer = codigo_acceso de la mesa. */
function pagoComensal(TestCase $test, string $codigo): TestCase
{
    return $test->withHeader('Authorization', 'Bearer '.$codigo);
}

/** Crea el pedido raíz del comensal con una línea. */
function pagoPedir(TestCase $test, Mesa $mesa, Plato $plato, int $cantidad = 1): TestResponse
{
    return pagoComensal($test, $mesa->codigo_acceso)->postJson('/api/cliente/pedidos', [
        'platos' => [['plato_id' => $plato->id, 'cantidad' => $cantidad]],
    ]);
}

/** Request del mozo (permiso tomar_pedidos): token Sanctum nuevo. */
function pagoMozo(TestCase $test): TestCase
{
    app('auth')->forgetGuards();

    $mozo = Usuario::factory()->create([
        'rol_id' => Rol::where('nombre', 'Mozo')->first()->id,
    ]);

    return $test->withToken($mozo->createToken('mozo')->plainTextToken);
}

/**
 * Pedido FINALIZADO (entregado) con una línea: la visita tiene saldo
 * pero sin pedidos activos — el escenario previo a cerrar la mesa.
 */
function pagoPedidoCobrable(Mesa $mesa, Plato $plato, float $total = 1000): Pedido
{
    $pedido = Pedido::create([
        'mesa_id' => $mesa->id,
        'estado' => 'entregado',
        'total' => $total,
        'fecha' => now()->toDateTimeString(),
    ]);

    DetallePedido::create([
        'pedido_id' => $pedido->id,
        'plato_id' => $plato->id,
        'cantidad' => 1,
        'precio_lista' => $total,
        'subtotal' => $total,
        'confirmado' => true,
    ]);

    return $pedido;
}

/**
 * Firma HMAC válida para el webhook (misma construcción que
 * MercadoPagoService::validarFirma). Manda el formato real de MP:
 * pares separados por coma.
 *
 * @return array<string, string>
 */
function pagoFirmar(string $dataId, string $ts = '1700000000'): array
{
    $manifest = 'id:'.$dataId.';ts:'.$ts.';';
    $v1 = hash_hmac('sha256', $manifest, 'secreto-webhook');

    return ['x-signature' => "ts={$ts},v1={$v1}"];
}

/**
 * Http::fake de Mercado Pago: preferencias (crear/consultar) y
 * consulta de pago. `$pagoMp` pisa campos del pago consultado; el
 * resto se deriva de la fila real (external_reference y monto).
 * `$pagosSearch` es lo que devuelve `/v1/payments/search` (reconciliación).
 *
 * Registrar ANTES de cualquier POST /cliente/pagos.
 *
 * @param  array<string, mixed>  $pagoMp
 * @param  list<array<string, mixed>>  $pagosSearch
 */
function pagoHttpFake(array $pagoMp = [], array $pagosSearch = []): void
{
    Http::fake(function ($request) use ($pagoMp, $pagosSearch) {
        $url = $request->url();

        if (str_contains($url, '/v1/payments/search')) {
            return Http::response(['results' => $pagosSearch], 200);
        }

        if (str_contains($url, '/v1/payments/')) {
            $pago = Pago::query()->latest('id')->first();

            return Http::response(array_merge([
                'id' => 987654,
                'status' => 'approved',
                'external_reference' => (string) ($pago?->id ?? ''),
                'transaction_amount' => (float) ($pago?->monto ?? 0),
            ], $pagoMp), 200);
        }

        return Http::response([
            'id' => 'pref-test-1',
            'init_point' => 'https://sandbox.mercadopago.com/checkout/v1/redirect?pref_id=pref-test-1',
        ], 200);
    });
}

/**
 * Http::fake controlable POR REFERENCIA: el test cambia lo que "MP
 * responde" a mitad del caso (reconciliación, caída) sin registrar un
 * segundo fake (los fakes se acumulan y gana el primero).
 *
 * Claves de `$estado`: `search` (results de /v1/payments/search),
 * `pago` (campos extra del pago consultado), `caido` (MP responde 5xx).
 *
 * @param  array<string, mixed>  $estado
 */
function pagoHttpFakeEstado(array &$estado): void
{
    Http::fake(function ($request) use (&$estado) {
        if (! empty($estado['caido'])) {
            return Http::response(['message' => 'Service Unavailable'], 503);
        }

        $url = $request->url();

        if (str_contains($url, '/v1/payments/search')) {
            return Http::response(['results' => $estado['search'] ?? []], 200);
        }

        if (str_contains($url, '/v1/payments/')) {
            $pago = Pago::query()->latest('id')->first();

            return Http::response(array_merge([
                'id' => 987654,
                'status' => 'approved',
                'external_reference' => (string) ($pago?->id ?? ''),
                'transaction_amount' => (float) ($pago?->monto ?? 0),
            ], $estado['pago'] ?? []), 200);
        }

        return Http::response([
            'id' => 'pref-test-1',
            'init_point' => 'https://sandbox.mercadopago.com/checkout/v1/redirect?pref_id=pref-test-1',
        ], 200);
    });
}

/*
|--------------------------------------------------------------------------
| Feature flag
|--------------------------------------------------------------------------
*/

test('sin credenciales el modulo queda apagado', function () {
    pagoDeshabilitar();
    $mesa = pagoMesa();

    // El saldo se sigue pudiendo leer (para mostrar la cuenta).
    pagoComensal($this, $mesa->codigo_acceso)
        ->getJson('/api/cliente/pagos')
        ->assertOk()
        ->assertJsonPath('habilitado', false);

    // Iniciar un pago sin el módulo apagado → 503.
    pagoComensal($this, $mesa->codigo_acceso)
        ->postJson('/api/cliente/pagos', ['tipo' => 'total'])
        ->assertStatus(503)
        ->assertJsonPath('message', 'Los pagos con Mercado Pago no están habilitados en este momento.');
});

test('el webhook tambien exige el modulo habilitado', function () {
    pagoDeshabilitar();

    $this->postJson('/api/webhooks/mercado-pago?type=payment&data.id=1', [], pagoFirmar('1'))
        ->assertStatus(503);
});

test('sin codigo de mesa no se entra a los pagos', function () {
    $this->getJson('/api/cliente/pagos')->assertUnauthorized();
    $this->postJson('/api/cliente/pagos', ['tipo' => 'total'])->assertUnauthorized();
});

test('un token de empleado no pasa el middleware del comensal', function () {
    $empleado = Usuario::factory()->create([
        'rol_id' => Rol::where('nombre', 'Mozo')->first()->id,
    ]);
    $token = $empleado->createToken('mozo')->plainTextToken;

    // El middleware distingue al empleado por el "|" del token Sanctum.
    $this->withToken($token)->getJson('/api/cliente/pagos')->assertForbidden();
});

/*
|--------------------------------------------------------------------------
| Saldo e historial
|--------------------------------------------------------------------------
*/

test('el saldo refleja el total de la visita y sus partes', function () {
    pagoHabilitar();
    $mesa = pagoMesa();
    $plato = pagoPlato(500);

    pagoPedir($this, $mesa, $plato, 2)->assertStatus(201);

    pagoComensal($this, $mesa->codigo_acceso)
        ->getJson('/api/cliente/pagos')
        ->assertOk()
        ->assertJsonPath('habilitado', true)
        ->assertJsonPath('saldo.total', 1000)
        ->assertJsonPath('saldo.pagado', 0)
        ->assertJsonPath('saldo.pendiente', 1000)
        ->assertJsonPath('saldo.partes.0.subtotal', 1000)
        ->assertJsonPath('saldo.partes.0.pendiente', 1000)
        ->assertJsonPath('pagos', []);
});

test('los pagos aprobados descuentan el saldo', function () {
    pagoHabilitar();
    $mesa = pagoMesa();
    $plato = pagoPlato(500);

    pagoPedir($this, $mesa, $plato, 2)->assertStatus(201);

    Pago::create([
        'mesa_id' => $mesa->id,
        'tipo' => Pago::TIPO_TOTAL,
        'monto' => 400,
        'estado' => Pago::ESTADO_APROBADO,
        'mp_payment_id' => '111222333',
    ]);

    pagoComensal($this, $mesa->codigo_acceso)
        ->getJson('/api/cliente/pagos')
        ->assertOk()
        ->assertJsonPath('saldo.total', 1000)
        ->assertJsonPath('saldo.pagado', 400)
        ->assertJsonPath('saldo.pendiente', 600)
        ->assertJsonPath('pagos.0.estado', 'aprobado');
});

/*
|--------------------------------------------------------------------------
| Alta de preferencia (Checkout Pro)
|--------------------------------------------------------------------------
*/

test('el pago total cobra el saldo vigente y crea la fila pendiente', function () {
    pagoHabilitar();
    pagoHttpFake();
    $mesa = pagoMesa();
    $plato = pagoPlato(1000);

    pagoPedir($this, $mesa, $plato, 2)->assertStatus(201);

    pagoComensal($this, $mesa->codigo_acceso)
        ->postJson('/api/cliente/pagos', ['tipo' => 'total'])
        ->assertStatus(201)
        ->assertJsonPath('monto', 2000)
        ->assertJsonPath('init_point', 'https://sandbox.mercadopago.com/checkout/v1/redirect?pref_id=pref-test-1')
        ->assertJsonPath('preference_id', 'pref-test-1');

    $pago = Pago::sole();
    expect($pago->estado)->toBe('pendiente')
        ->and($pago->tipo)->toBe('total')
        ->and((float) $pago->monto)->toBe(2000.0)
        ->and($pago->pedido_id)->toBeNull()
        ->and($pago->mp_preference_id)->toBe('pref-test-1');
});

test('el monto lo calcula el backend: el del cliente se ignora', function () {
    pagoHabilitar();
    pagoHttpFake();
    $mesa = pagoMesa();
    $plato = pagoPlato(1000);

    pagoPedir($this, $mesa, $plato, 2)->assertStatus(201);

    pagoComensal($this, $mesa->codigo_acceso)
        ->postJson('/api/cliente/pagos', ['tipo' => 'total', 'monto' => 1])
        ->assertStatus(201)
        ->assertJsonPath('monto', 2000);

    expect((float) Pago::sole()->monto)->toBe(2000.0);
});

test('pagar mi parte cobra el subtotal de la raiz del comensal', function () {
    pagoHabilitar();
    pagoHttpFake();
    $mesa = pagoMesa();
    $plato = pagoPlato(300);

    pagoPedir($this, $mesa, $plato, 2)->assertStatus(201);
    $raiz = $mesa->pedidos()->firstOrFail();

    pagoComensal($this, $mesa->codigo_acceso)
        ->postJson('/api/cliente/pagos', ['tipo' => 'mi_parte', 'pedido_id' => $raiz->id])
        ->assertStatus(201)
        ->assertJsonPath('monto', 600);

    $pago = Pago::sole();
    expect($pago->tipo)->toBe('mi_parte')
        ->and($pago->pedido_id)->toBe($raiz->id)
        ->and((float) $pago->monto)->toBe(600.0);
});

test('pagar mi parte sin pedido responde 422', function () {
    pagoHabilitar();
    pagoHttpFake();
    $mesa = pagoMesa();

    pagoComensal($this, $mesa->codigo_acceso)
        ->postJson('/api/cliente/pagos', ['tipo' => 'mi_parte'])
        ->assertStatus(422)
        ->assertJsonPath('message', 'Para pagar tu parte necesitás indicar tu pedido.');

    expect(Pago::count())->toBe(0);
});

test('una parte ya saldada no genera otra intencion de pago', function () {
    pagoHabilitar();
    pagoHttpFake();
    $mesa = pagoMesa();
    $plato = pagoPlato(300);

    pagoPedir($this, $mesa, $plato, 2)->assertStatus(201);
    $raiz = $mesa->pedidos()->firstOrFail();

    Pago::create([
        'mesa_id' => $mesa->id,
        'pedido_id' => $raiz->id,
        'tipo' => Pago::TIPO_MI_PARTE,
        'monto' => 600,
        'estado' => Pago::ESTADO_APROBADO,
        'mp_payment_id' => '555666777',
    ]);

    pagoComensal($this, $mesa->codigo_acceso)
        ->postJson('/api/cliente/pagos', ['tipo' => 'mi_parte', 'pedido_id' => $raiz->id])
        ->assertStatus(422)
        ->assertJsonPath('message', 'Tu parte ya está saldada.');
});

test('la preferencia pendiente se reutiliza sin duplicar filas', function () {
    pagoHabilitar();
    pagoHttpFake();
    $mesa = pagoMesa();
    $plato = pagoPlato(1000);

    pagoPedir($this, $mesa, $plato, 1)->assertStatus(201);

    $primera = pagoComensal($this, $mesa->codigo_acceso)
        ->postJson('/api/cliente/pagos', ['tipo' => 'total'])
        ->assertStatus(201);

    $segunda = pagoComensal($this, $mesa->codigo_acceso)
        ->postJson('/api/cliente/pagos', ['tipo' => 'total'])
        ->assertStatus(201);

    expect(Pago::count())->toBe(1)
        ->and($segunda->json('pago_id'))->toBe($primera->json('pago_id'));
});

test('si el monto cambia la preferencia vieja se cancela y se crea otra', function () {
    pagoHabilitar();
    pagoHttpFake();
    $mesa = pagoMesa();
    $plato = pagoPlato(1000);

    pagoPedir($this, $mesa, $plato, 1)->assertStatus(201);

    pagoComensal($this, $mesa->codigo_acceso)
        ->postJson('/api/cliente/pagos', ['tipo' => 'total'])
        ->assertStatus(201);

    // Pide más comida: el saldo cambió.
    pagoPedir($this, $mesa, $plato, 1)->assertStatus(201);

    pagoComensal($this, $mesa->codigo_acceso)
        ->postJson('/api/cliente/pagos', ['tipo' => 'total'])
        ->assertStatus(201);

    $pagos = Pago::orderBy('id')->get();
    expect($pagos)->toHaveCount(2)
        ->and($pagos[0]->estado)->toBe('cancelado')
        ->and($pagos[1]->estado)->toBe('pendiente')
        ->and((float) $pagos[1]->monto)->toBe(2000.0);
});

/*
|--------------------------------------------------------------------------
| Webhook (fuente de verdad)
|--------------------------------------------------------------------------
*/

test('el webhook rechaza una firma invalida', function () {
    pagoHabilitar();
    pagoHttpFake();

    $this->postJson('/api/webhooks/mercado-pago?type=payment&data.id=987654', [], [
        'x-signature' => 'ts=1700000000;v1=maliciosa',
    ])->assertStatus(401);

    // Sin header de firma tampoco pasa.
    $this->postJson('/api/webhooks/mercado-pago?type=payment&data.id=987654')
        ->assertStatus(401);
});

test('el webhook con firma valida aprueba el pago notificado', function () {
    pagoHabilitar();
    pagoHttpFake();
    $mesa = pagoMesa();
    $plato = pagoPlato(1000);

    pagoPedir($this, $mesa, $plato, 1)->assertStatus(201);

    pagoComensal($this, $mesa->codigo_acceso)
        ->postJson('/api/cliente/pagos', ['tipo' => 'total'])
        ->assertStatus(201);

    $pago = Pago::sole();

    // El fake deriva external_reference y monto de la fila real.
    $this->postJson(
        '/api/webhooks/mercado-pago?type=payment&data.id=987654',
        [],
        pagoFirmar('987654'),
    )->assertOk()->assertJsonPath('procesado', true)->assertJsonPath('estado', 'aprobado');

    expect($pago->fresh()->estado)->toBe('aprobado')
        ->and($pago->fresh()->mp_payment_id)->toBe('987654');
});

test('el webhook guarda el json de mp con las comisiones del pago', function () {
    pagoHabilitar();
    pagoHttpFake([
        'fee_details' => [
            ['amount' => 60.5, 'fee_payer' => 'collector', 'type' => 'mercadopago_fee'],
        ],
        'transaction_details' => [
            'net_received_amount' => 939.5,
            'total_paid_amount' => 1000,
        ],
    ]);
    $mesa = pagoMesa();
    $plato = pagoPlato(1000);

    pagoPedir($this, $mesa, $plato, 1)->assertStatus(201);
    pagoComensal($this, $mesa->codigo_acceso)
        ->postJson('/api/cliente/pagos', ['tipo' => 'total'])
        ->assertStatus(201);

    $pago = Pago::sole();

    $this->postJson(
        '/api/webhooks/mercado-pago?type=payment&data.id=987654',
        [],
        pagoFirmar('987654'),
    )->assertOk()->assertJsonPath('estado', 'aprobado');

    // El JSON crudo de MP queda en mp_detalle: comisiones + neto.
    $detalle = $pago->fresh()->mp_detalle;

    expect($detalle['fee_details'][0]['amount'])->toBe(60.5)
        ->and($detalle['fee_details'][0]['type'])->toBe('mercadopago_fee')
        ->and($detalle['transaction_details']['net_received_amount'])->toBe(939.5)
        ->and($detalle['transaction_details']['total_paid_amount'])->toBe(1000);
});

test('el detalle del pago se expone al cliente de la mesa', function () {
    pagoHabilitar();
    $mesa = pagoMesa();

    $pago = Pago::create([
        'mesa_id' => $mesa->id,
        'tipo' => Pago::TIPO_TOTAL,
        'monto' => 1000,
        'estado' => Pago::ESTADO_APROBADO,
        'mp_payment_id' => '987654',
        'mp_detalle' => [
            'fee_details' => [
                ['amount' => 60.5, 'fee_payer' => 'collector', 'type' => 'mercadopago_fee'],
            ],
            'transaction_details' => ['net_received_amount' => 939.5],
        ],
    ]);

    pagoComensal($this, $mesa->codigo_acceso)
        ->getJson("/api/cliente/pagos/{$pago->id}/detalle")
        ->assertOk()
        ->assertJsonPath('pago_id', $pago->id)
        ->assertJsonPath('monto', 1000)
        ->assertJsonPath('mp_detalle.fee_details.0.amount', 60.5)
        ->assertJsonPath('mp_detalle.transaction_details.net_received_amount', 939.5);
});

test('el detalle del pago no existe para otra mesa ni para efectivo', function () {
    pagoHabilitar();
    $mesa = pagoMesa();
    $otraMesa = pagoMesa();

    $pagoAjeno = Pago::create([
        'mesa_id' => $otraMesa->id,
        'tipo' => Pago::TIPO_TOTAL,
        'monto' => 1000,
        'estado' => Pago::ESTADO_APROBADO,
        'mp_payment_id' => '111222',
    ]);
    $efectivo = Pago::create([
        'mesa_id' => $mesa->id,
        'tipo' => Pago::TIPO_TOTAL,
        'monto' => 500,
        'estado' => Pago::ESTADO_APROBADO,
        'medio_pago' => Pago::MEDIO_EFECTIVO,
    ]);

    // Pago de otra visita.
    pagoComensal($this, $mesa->codigo_acceso)
        ->getJson("/api/cliente/pagos/{$pagoAjeno->id}/detalle")
        ->assertStatus(422);

    // Un cobro en efectivo no pasa por MP.
    pagoComensal($this, $mesa->codigo_acceso)
        ->getJson("/api/cliente/pagos/{$efectivo->id}/detalle")
        ->assertStatus(422);

    // Inexistente.
    pagoComensal($this, $mesa->codigo_acceso)
        ->getJson('/api/cliente/pagos/999999/detalle')
        ->assertStatus(422);
});

test('el webhook es idempotente por mp_payment_id', function () {
    pagoHabilitar();
    pagoHttpFake();
    $mesa = pagoMesa();
    $plato = pagoPlato(1000);

    pagoPedir($this, $mesa, $plato, 1)->assertStatus(201);
    pagoComensal($this, $mesa->codigo_acceso)
        ->postJson('/api/cliente/pagos', ['tipo' => 'total'])
        ->assertStatus(201);

    $headers = pagoFirmar('987654');

    $this->postJson('/api/webhooks/mercado-pago?type=payment&data.id=987654', [], $headers)
        ->assertOk()->assertJsonPath('estado', 'aprobado');

    // La notificación repetida no cambia nada ni duplica filas.
    $this->postJson('/api/webhooks/mercado-pago?type=payment&data.id=987654', [], $headers)
        ->assertOk()->assertJsonPath('estado', 'aprobado');

    expect(Pago::count())->toBe(1)
        ->and(Pago::sole()->estado)->toBe('aprobado');
});

test('el reintento de un intento rechazado no degrada un pago aprobado', function () {
    pagoHabilitar();

    // Dos intentos para la misma fila: 987654 aprobado y 111222
    // rechazado. MP reintenta cada notificación cada 15 min, así que
    // el rechazo puede llegar DESPUÉS del aprobado.
    Http::fake(function ($request) {
        $url = $request->url();

        if (str_contains($url, '/v1/payments/')) {
            $pago = Pago::query()->latest('id')->first();
            $paymentId = basename((string) parse_url($url, PHP_URL_PATH));

            return Http::response([
                'id' => $paymentId,
                'status' => $paymentId === '111222' ? 'rejected' : 'approved',
                'external_reference' => (string) ($pago?->id ?? ''),
                'transaction_amount' => (float) ($pago?->monto ?? 0),
            ], 200);
        }

        return Http::response([
            'id' => 'pref-test-1',
            'init_point' => 'https://sandbox.mercadopago.com/checkout/v1/redirect?pref_id=pref-test-1',
        ], 200);
    });

    $mesa = pagoMesa();
    $plato = pagoPlato(1000);

    pagoPedir($this, $mesa, $plato, 1)->assertStatus(201);
    pagoComensal($this, $mesa->codigo_acceso)
        ->postJson('/api/cliente/pagos', ['tipo' => 'total'])
        ->assertStatus(201);

    $this->postJson('/api/webhooks/mercado-pago?type=payment&data.id=987654', [], pagoFirmar('987654'))
        ->assertOk()->assertJsonPath('estado', 'aprobado');

    $this->postJson('/api/webhooks/mercado-pago?type=payment&data.id=111222', [], pagoFirmar('111222'))
        ->assertOk()->assertJsonPath('estado', 'aprobado');

    expect(Pago::sole()->estado)->toBe('aprobado')
        ->and(Pago::sole()->mp_payment_id)->toBe('987654');
});

test('un pago notificado con monto distinto no se aprueba', function () {
    pagoHabilitar();
    // MP reporta un importe distinto al registrado (posible fraude
    // o preferencia manipulada): NO se aprueba.
    pagoHttpFake(['transaction_amount' => 10.0]);
    $mesa = pagoMesa();
    $plato = pagoPlato(1000);

    pagoPedir($this, $mesa, $plato, 1)->assertStatus(201);
    pagoComensal($this, $mesa->codigo_acceso)
        ->postJson('/api/cliente/pagos', ['tipo' => 'total'])
        ->assertStatus(201);

    $pago = Pago::sole();

    $this->postJson(
        '/api/webhooks/mercado-pago?type=payment&data.id=987654',
        [],
        pagoFirmar('987654'),
    )->assertOk()->assertJsonPath('estado', 'pendiente');

    expect($pago->fresh()->estado)->toBe('pendiente');
});

test('una notificacion de un pago desconocido se ignora', function () {
    pagoHabilitar();
    pagoHttpFake(['external_reference' => '999999']);

    $this->postJson(
        '/api/webhooks/mercado-pago?type=payment&data.id=987654',
        [],
        pagoFirmar('987654'),
    )->assertOk()->assertJsonPath('procesado', true)->assertJsonPath('pago_id', null);
});

test('el saldo queda en cero tras el pago aprobado', function () {
    pagoHabilitar();
    pagoHttpFake();
    $mesa = pagoMesa();
    $plato = pagoPlato(1000);

    pagoPedir($this, $mesa, $plato, 1)->assertStatus(201);
    pagoComensal($this, $mesa->codigo_acceso)
        ->postJson('/api/cliente/pagos', ['tipo' => 'total'])
        ->assertStatus(201);

    $this->postJson(
        '/api/webhooks/mercado-pago?type=payment&data.id=987654',
        [],
        pagoFirmar('987654'),
    )->assertOk();

    pagoComensal($this, $mesa->codigo_acceso)
        ->getJson('/api/cliente/pagos')
        ->assertOk()
        ->assertJsonPath('saldo.pagado', 1000)
        ->assertJsonPath('saldo.pendiente', 0);

    // Con la cuenta saldada no se puede iniciar otro pago total.
    pagoComensal($this, $mesa->codigo_acceso)
        ->postJson('/api/cliente/pagos', ['tipo' => 'total'])
        ->assertStatus(422)
        ->assertJsonPath('message', 'La cuenta ya está saldada.');
});

test('la cuenta del staff trae el saldo de pagos y el historial', function () {
    pagoHabilitar();
    $mesa = pagoMesa();
    $plato = pagoPlato(500);

    pagoPedir($this, $mesa, $plato, 2)->assertStatus(201);

    Pago::create([
        'mesa_id' => $mesa->id,
        'tipo' => Pago::TIPO_TOTAL,
        'monto' => 400,
        'estado' => Pago::ESTADO_APROBADO,
        'mp_payment_id' => '777888999',
    ]);

    $mozo = Usuario::factory()->create([
        'rol_id' => Rol::where('nombre', 'Mozo')->first()->id,
    ]);
    $token = $mozo->createToken('mozo')->plainTextToken;

    // El mozo ve "Pagado por MP" y cuánto falta sin tocar /cliente.
    $this->withToken($token)
        ->getJson("/api/mesas/{$mesa->id}/cuenta")
        ->assertOk()
        ->assertJsonPath('saldo.total', 1000)
        ->assertJsonPath('saldo.pagado', 400)
        ->assertJsonPath('saldo.pendiente', 600)
        ->assertJsonPath('saldo.partes.0.pagado', 400)
        ->assertJsonPath('saldo.partes.0.pendiente', 600)
        ->assertJsonPath('pagos.0.estado', 'aprobado')
        ->assertJsonPath('pagos.0.monto', 400);
});

test('el retorno del checkout apunta al front y la notificacion al back', function () {
    pagoHabilitar();
    config(['services.mercadopago.return_url' => 'https://gastro.example']);

    $capturado = null;
    Http::fake(function ($request) use (&$capturado) {
        $capturado = $request;

        return Http::response([
            'id' => 'pref-test-1',
            'init_point' => 'https://sandbox.mercadopago.com/checkout/v1/redirect?pref_id=pref-test-1',
        ], 200);
    });

    $mesa = pagoMesa();
    pagoPedir($this, $mesa, pagoPlato(1000), 1)->assertStatus(201);

    pagoComensal($this, $mesa->codigo_acceso)
        ->postJson('/api/cliente/pagos', ['tipo' => 'total'])
        ->assertStatus(201);

    $datos = $capturado->data();
    $pago = Pago::sole();

    // La SPA (front) recibe el retorno; el webhook notifica al back.
    expect($datos['back_urls']['success'])->toBe('https://gastro.example/pedido')
        ->and($datos['back_urls']['pending'])->toBe('https://gastro.example/pedido')
        ->and($datos['back_urls']['failure'])->toBe('https://gastro.example/pedido')
        // Con el pago aprobado MP redirige solo al front.
        ->and($datos['auto_return'])->toBe('approved')
        ->and($datos['notification_url'])->toBe('http://localhost:8000/api/webhooks/mercado-pago')
        ->and($datos['external_reference'])->toBe((string) $pago->id);
});

test('sin MP_RETURN_URL el retorno cae en la base del back', function () {
    pagoHabilitar();
    config(['services.mercadopago.return_url' => null]);

    $capturado = null;
    Http::fake(function ($request) use (&$capturado) {
        $capturado = $request;

        return Http::response([
            'id' => 'pref-test-1',
            'init_point' => 'https://sandbox.mercadopago.com/checkout/v1/redirect?pref_id=pref-test-1',
        ], 200);
    });

    $mesa = pagoMesa();
    pagoPedir($this, $mesa, pagoPlato(1000), 1)->assertStatus(201);

    pagoComensal($this, $mesa->codigo_acceso)
        ->postJson('/api/cliente/pagos', ['tipo' => 'total'])
        ->assertStatus(201);

    // Mono-dominio: el front y el back comparten la base de APP_URL.
    expect($capturado->data()['back_urls']['success'])->toBe('http://localhost:8000/pedido');
});

/*
|--------------------------------------------------------------------------
| Red de seguridad contra el doble cobro (estado en_proceso)
|--------------------------------------------------------------------------
*/

test('un pago sin resolver en mp queda en_proceso y no cuenta en el saldo', function () {
    pagoHabilitar();
    pagoHttpFake(['status' => 'pending']);
    $mesa = pagoMesa();
    $plato = pagoPlato(1000);

    pagoPedir($this, $mesa, $plato, 1)->assertStatus(201);
    pagoComensal($this, $mesa->codigo_acceso)
        ->postJson('/api/cliente/pagos', ['tipo' => 'total'])
        ->assertStatus(201);

    // El webhook avisa: MP tiene el pago SIN resolver (fondos retenidos).
    $this->postJson(
        '/api/webhooks/mercado-pago?type=payment&data.id=987654',
        [],
        pagoFirmar('987654'),
    )->assertOk()->assertJsonPath('estado', 'en_proceso');

    // No cuenta como pagado...
    pagoComensal($this, $mesa->codigo_acceso)
        ->getJson('/api/cliente/pagos')
        ->assertOk()
        ->assertJsonPath('saldo.pagado', 0)
        ->assertJsonPath('saldo.pendiente', 1000)
        ->assertJsonPath('pagos.0.estado', 'en_proceso');

    // ...y bloquea un nuevo intento de pago (no se cobra dos veces).
    pagoComensal($this, $mesa->codigo_acceso)
        ->postJson('/api/cliente/pagos', ['tipo' => 'total'])
        ->assertStatus(422)
        ->assertJsonPath(
            'message',
            'Hay un pago en proceso de acreditación. Esperá unos minutos antes de volver a pagar.',
        );
});

test('el pago en proceso tampoco admite pagar la parte individual', function () {
    pagoHabilitar();
    pagoHttpFake(['status' => 'in_process']);
    $mesa = pagoMesa();
    $plato = pagoPlato(1000);

    pagoPedir($this, $mesa, $plato, 1)->assertStatus(201);
    pagoComensal($this, $mesa->codigo_acceso)
        ->postJson('/api/cliente/pagos', ['tipo' => 'total'])
        ->assertStatus(201);

    $this->postJson(
        '/api/webhooks/mercado-pago?type=payment&data.id=987654',
        [],
        pagoFirmar('987654'),
    )->assertOk()->assertJsonPath('estado', 'en_proceso');

    $pedidoId = Pago::sole()->pedido_id;

    pagoComensal($this, $mesa->codigo_acceso)
        ->postJson('/api/cliente/pagos', ['tipo' => 'mi_parte', 'pedido_id' => $pedidoId])
        ->assertStatus(422);
});

test('si mp ya cobro y el webhook se perdio, iniciar un pago lo reconcilia', function () {
    pagoHabilitar();
    $estado = [];
    pagoHttpFakeEstado($estado);
    $mesa = pagoMesa();
    $plato = pagoPlato(1000);

    pagoPedir($this, $mesa, $plato, 1)->assertStatus(201);

    // Primera intención: preferencia creada, sin notificación (webhook perdido).
    pagoComensal($this, $mesa->codigo_acceso)
        ->postJson('/api/cliente/pagos', ['tipo' => 'total'])
        ->assertStatus(201);

    $pago = Pago::sole();
    expect($pago->estado)->toBe('pendiente');

    // MP YA cobró (el pago real existe aprobado con nuestro external_reference).
    $estado['search'] = [[
        'id' => 555000,
        'status' => 'approved',
        'external_reference' => (string) $pago->id,
        'transaction_amount' => 1000,
    ]];

    // Reintentar pagar reconcilia: el pago queda aprobado y no se
    // ofrece un checkout nuevo (la cuenta ya está saldada).
    pagoComensal($this, $mesa->codigo_acceso)
        ->postJson('/api/cliente/pagos', ['tipo' => 'total'])
        ->assertStatus(422)
        ->assertJsonPath('message', 'La cuenta ya está saldada.');

    expect($pago->fresh()->estado)->toBe('aprobado');
});

test('si mercadopago no responde no se ofrece un checkout nuevo', function () {
    pagoHabilitar();
    $estado = [];
    pagoHttpFakeEstado($estado);
    $mesa = pagoMesa();
    $plato = pagoPlato(1000);

    pagoPedir($this, $mesa, $plato, 1)->assertStatus(201);
    pagoComensal($this, $mesa->codigo_acceso)
        ->postJson('/api/cliente/pagos', ['tipo' => 'total'])
        ->assertStatus(201);

    // MP caído: la reconciliación no puede confirmar nada → 502.
    $estado['caido'] = true;

    pagoComensal($this, $mesa->codigo_acceso)
        ->postJson('/api/cliente/pagos', ['tipo' => 'total'])
        ->assertStatus(502);
});

/*
|--------------------------------------------------------------------------
| Verificación del retorno del checkout (POST /cliente/pagos/verificar)
|--------------------------------------------------------------------------
*/

test('el comensal verifica su pago al volver del checkout', function () {
    pagoHabilitar();
    pagoHttpFake();
    $mesa = pagoMesa();
    $plato = pagoPlato(1000);

    pagoPedir($this, $mesa, $plato, 1)->assertStatus(201);
    pagoComensal($this, $mesa->codigo_acceso)
        ->postJson('/api/cliente/pagos', ['tipo' => 'total'])
        ->assertStatus(201);

    // Vuelve con ?payment_id=… en la URL: la verificación consulta a
    // MP (fuente de verdad) y devuelve estado + saldo refrescado.
    pagoComensal($this, $mesa->codigo_acceso)
        ->postJson('/api/cliente/pagos/verificar', ['payment_id' => '987654'])
        ->assertOk()
        ->assertJsonPath('verificacion.estado', 'aprobado')
        ->assertJsonPath('saldo.pagado', 1000)
        ->assertJsonPath('saldo.pendiente', 0);
});

test('la verificacion por preferencia reconcilia el pago', function () {
    pagoHabilitar();
    $estado = [];
    pagoHttpFakeEstado($estado);
    $mesa = pagoMesa();
    $plato = pagoPlato(1000);

    pagoPedir($this, $mesa, $plato, 1)->assertStatus(201);
    pagoComensal($this, $mesa->codigo_acceso)
        ->postJson('/api/cliente/pagos', ['tipo' => 'total'])
        ->assertStatus(201);

    $pago = Pago::sole();

    // Sin payment_id en la URL: sólo la preferencia. MP ya tiene el
    // pago aprobado (webhook perdido) y la búsqueda lo encuentra.
    $estado['search'] = [[
        'id' => 555000,
        'status' => 'approved',
        'external_reference' => (string) $pago->id,
        'transaction_amount' => 1000,
    ]];

    pagoComensal($this, $mesa->codigo_acceso)
        ->postJson('/api/cliente/pagos/verificar', ['preference_id' => $pago->mp_preference_id])
        ->assertOk()
        ->assertJsonPath('verificacion.estado', 'aprobado')
        ->assertJsonPath('saldo.pendiente', 0);
});

test('la verificacion sin referencia se rechaza', function () {
    pagoHabilitar();
    $mesa = pagoMesa();

    pagoComensal($this, $mesa->codigo_acceso)
        ->postJson('/api/cliente/pagos/verificar', [])
        ->assertStatus(422)
        ->assertJsonPath('message', 'No se recibió ninguna referencia del pago.');
});

test('la verificacion de un pago desconocido se rechaza', function () {
    pagoHabilitar();
    pagoHttpFake(['external_reference' => '999999']);
    $mesa = pagoMesa();

    pagoComensal($this, $mesa->codigo_acceso)
        ->postJson('/api/cliente/pagos/verificar', ['payment_id' => '987654'])
        ->assertStatus(422)
        ->assertJsonPath('message', 'No se encontró ningún pago con esa referencia.');
});

test('la verificacion no alcanza pagos de otra mesa', function () {
    pagoHabilitar();
    $mesaAjena = pagoMesa();
    $otra = pagoMesa();

    // El pago pertenece a OTRA visita (otro codigo_acceso).
    Pago::create([
        'mesa_id' => $mesaAjena->id,
        'tipo' => Pago::TIPO_TOTAL,
        'monto' => 1000,
        'estado' => Pago::ESTADO_PENDIENTE,
        'mp_preference_id' => 'pref-ajena',
    ]);

    // MP responde que ese pago está aprobado…
    Http::fake(fn ($request) => str_contains($request->url(), '/v1/payments/')
        ? Http::response([
            'id' => 444000,
            'status' => 'approved',
            'external_reference' => (string) Pago::sole()->id,
            'transaction_amount' => 1000,
        ], 200)
        : Http::response(['id' => 'pref-test-1', 'init_point' => 'x'], 200));

    // …pero la comensal de OTRA mesa no puede apropiarse de él.
    pagoComensal($this, $otra->codigo_acceso)
        ->postJson('/api/cliente/pagos/verificar', ['payment_id' => '444000'])
        ->assertStatus(422)
        ->assertJsonPath('message', 'Ese pago no corresponde a esta mesa.');
});

test('la verificacion exige el modulo habilitado', function () {
    pagoDeshabilitar();
    $mesa = pagoMesa();

    pagoComensal($this, $mesa->codigo_acceso)
        ->postJson('/api/cliente/pagos/verificar', ['payment_id' => '1'])
        ->assertStatus(503);
});

test('sin codigo de mesa no se verifica el pago', function () {
    $this->postJson('/api/cliente/pagos/verificar', ['payment_id' => '1'])->assertUnauthorized();
});

/*
|--------------------------------------------------------------------------
| Cobro en EFECTIVO (POST /mesas/{mesa}/pagos) + cierre con cuenta saldada
|--------------------------------------------------------------------------
*/

test('el mozo registra un cobro en efectivo y la visita se puede cerrar', function () {
    $mesa = pagoMesa();
    $plato = pagoPlato(1000);

    // Pedido finalizado (sin activos) con $1000 de saldo por cobrar.
    pagoPedidoCobrable($mesa, $plato);

    // El mozo cobra el saldo pendiente en efectivo: el pago nace
    // APROBADO con medio_pago=efectivo (no pasa por Mercado Pago).
    pagoMozo($this)
        ->postJson("/api/mesas/{$mesa->id}/pagos", ['monto' => 1000])
        ->assertStatus(201)
        ->assertJsonPath('pago.estado', 'aprobado')
        ->assertJsonPath('pago.medio_pago', 'efectivo')
        ->assertJsonPath('saldo.pagado', 1000)
        ->assertJsonPath('saldo.pendiente', 0);

    // Con la cuenta saldada, la visita se cierra (borrado lógico).
    pagoMozo($this)->postJson("/api/mesas/{$mesa->id}/cerrar")->assertStatus(200);

    expect(Mesa::find($mesa->id))->toBeNull()
        ->and(Pago::sole()->medio_pago)->toBe('efectivo');
});

test('un cobro en efectivo parcial no alcanza para cerrar la visita', function () {
    $mesa = pagoMesa();
    $plato = pagoPlato(1000);

    pagoPedidoCobrable($mesa, $plato);

    pagoMozo($this)
        ->postJson("/api/mesas/{$mesa->id}/pagos", ['monto' => 400])
        ->assertStatus(201)
        ->assertJsonPath('saldo.pendiente', 600);

    pagoMozo($this)
        ->postJson("/api/mesas/{$mesa->id}/cerrar")
        ->assertStatus(422)
        ->assertJsonPath(
            'message',
            'No se puede cerrar la mesa: la cuenta tiene un saldo pendiente de $600,00. Cobralo (efectivo o Mercado Pago) antes de cerrar la visita.',
        );

    expect(Mesa::find($mesa->id))->not->toBeNull();
});

test('el cobro en efectivo no puede superar el saldo pendiente', function () {
    $mesa = pagoMesa();
    $plato = pagoPlato(1000);

    pagoPedir($this, $mesa, $plato, 1)->assertStatus(201);

    pagoMozo($this)
        ->postJson("/api/mesas/{$mesa->id}/pagos", ['monto' => 1500])
        ->assertStatus(422)
        ->assertJsonPath('message', 'El monto no puede superar el saldo pendiente de la cuenta.');

    expect(Pago::count())->toBe(0);
});

test('el cobro en efectivo exige un monto mayor a cero', function () {
    $mesa = pagoMesa();

    pagoMozo($this)
        ->postJson("/api/mesas/{$mesa->id}/pagos", ['monto' => 0])
        ->assertStatus(422);
});

test('con un pago en proceso en mp no se registra cobro en efectivo', function () {
    pagoHabilitar();
    pagoHttpFake(['status' => 'pending']);
    $mesa = pagoMesa();
    $plato = pagoPlato(1000);

    pagoPedir($this, $mesa, $plato, 1)->assertStatus(201);
    pagoComensal($this, $mesa->codigo_acceso)
        ->postJson('/api/cliente/pagos', ['tipo' => 'total'])
        ->assertStatus(201);

    $this->postJson(
        '/api/webhooks/mercado-pago?type=payment&data.id=987654',
        [],
        pagoFirmar('987654'),
    )->assertOk()->assertJsonPath('estado', 'en_proceso');

    // MP retiene fondos: cobrar en efectivo encima duplicaría el cargo.
    pagoMozo($this)
        ->postJson("/api/mesas/{$mesa->id}/pagos", ['monto' => 1000])
        ->assertStatus(422)
        ->assertJsonPath(
            'message',
            'Hay un pago en proceso de acreditación. Esperá unos minutos antes de volver a pagar.',
        );

    expect(Pago::sole()->estado)->toBe('en_proceso');
});

test('el cobro en efectivo exige tomar_pedidos', function () {
    $mesa = pagoMesa();

    $this->postJson("/api/mesas/{$mesa->id}/pagos", ['monto' => 100])->assertStatus(401);
});
