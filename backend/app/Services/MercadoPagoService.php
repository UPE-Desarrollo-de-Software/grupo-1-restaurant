<?php

namespace App\Services;

use App\Exceptions\ApiException;
use App\Models\Pago;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;

/**
 * MERCADO PAGO — Checkout Pro (adaptador externo del pago del
 * comensal, DER v3.2).
 *
 * Sin SDK: se habla con la API por la facade `Http` (facilite el
 * `Http::fake()` en tests). Tres responsabilidades:
 *  - `crearPreferencia()`: arma la preferencia de pago (el monto lo
 *    recibe YA calculado por el dominio, nunca del cliente);
 *  - `consultarPago()`: consulta el pago por id (el webhook es la
 *    fuente de verdad, pero sirve para reconciliar);
 *  - `validarFirma()`: verifica la firma HMAC `x-signature` que manda
 *    MP en las notificaciones (obligatorio: sin ella cualquier POST
 *    podría marcar un pago como aprobado).
 *
 * Feature flag: sin `MP_ACCESS_TOKEN` el módulo está apagado y cada
 * método lanza ApiException 503.
 */
class MercadoPagoService
{
    private const API_BASE = 'https://api.mercadopago.com';

    // ==================== FEATURE FLAG ====================

    /**
     * ¿El módulo de pagos está habilitado? (MP_ACCESS_TOKEN presente
     * y MP_ENABLED distinto de false).
     */
    public function habilitado(): bool
    {
        $config = config('services.mercadopago', []);

        return (bool) ($config['enabled'] ?? true) && ! empty($config['access_token']);
    }

    /**
     * Lanza 503 si el módulo está apagado (sin credenciales MP).
     *
     * @throws ApiException
     */
    public function exigirHabilitado(): void
    {
        if (! $this->habilitado()) {
            throw new ApiException(503, 'Los pagos con Mercado Pago no están habilitados en este momento.');
        }
    }

    // ==================== PREFERENCIA ====================

    /**
     * Crea la preferencia de Checkout Pro en Mercado Pago y devuelve
     * `init_point` (URL de pago) + `preference_id`.
     *
     * @param  array{titulo: string, monto: float, referencia_externa: string, notificacion?: string, retorno?: string}  $datos
     * @return array{init_point: string, preference_id: string}
     *
     * @throws ApiException si MP rechaza o responde error
     */
    public function crearPreferencia(array $datos): array
    {
        $this->exigirHabilitado();

        $config = config('services.mercadopago');

        $cuerpo = [
            'items' => [[
                'id' => $datos['referencia_externa'],
                'title' => $datos['titulo'],
                'quantity' => 1,
                'unit_price' => round($datos['monto'], 2),
                'currency_id' => 'ARS',
            ]],
            'external_reference' => $datos['referencia_externa'],
            // El webhook ES la fuente de verdad del estado del pago.
            'notification_url' => $datos['notificacion'] ?? null,
            'back_urls' => isset($datos['retorno'])
                ? [
                    'success' => $datos['retorno'],
                    'pending' => $datos['retorno'],
                    'failure' => $datos['retorno'],
                ]
                : null,
            // Con el pago aprobado MP redirige SOLO al success (si no,
            // muestra el botón "Volver al sitio" y hay que apretarlo).
            'auto_return' => isset($datos['retorno']) ? 'approved' : null,
            // false (default): admite estados pendiente/aprobado/
            // rechazado; el webhook los traduce al estado del PAGO.
            'binary_mode' => false,
            'statement_descriptor' => 'RESTAURANTE',
        ];

        $respuesta = $this->cliente()
            ->post(self::API_BASE.'/checkout/preferences', array_filter(
                $cuerpo,
                fn (mixed $valor) => $valor !== null,
            ));

        $this->exigirOk($respuesta, 'No se pudo iniciar el pago con Mercado Pago.');

        $datosRespuesta = $respuesta->json();

        return [
            'init_point' => (string) ($datosRespuesta['init_point'] ?? ''),
            'preference_id' => (string) ($datosRespuesta['id'] ?? ''),
        ];
    }

    // ==================== CONSULTA DE PAGO ====================

    /**
     * Preferencia por id (para reutilizar el `init_point` de un pago
     * pendiente sin duplicar la intención de pago).
     *
     * @return array{init_point: string, id: string}
     *
     * @throws ApiException si MP responde error
     */
    public function consultarPreferencia(string $preferenceId): array
    {
        $this->exigirHabilitado();

        $respuesta = $this->cliente()
            ->get(self::API_BASE.'/checkout/preferences/'.rawurlencode($preferenceId));

        $this->exigirOk($respuesta, 'No se pudo recuperar el pago en Mercado Pago.');

        $datos = $respuesta->json();

        return [
            'init_point' => (string) ($datos['init_point'] ?? ''),
            'id' => (string) ($datos['id'] ?? ''),
        ];
    }

    /**
     * Pago por id en Mercado Pago (reconciliación manual / respaldo
     * del webhook).
     *
     * @return array<string, mixed>
     *
     * @throws ApiException si MP responde error
     */
    public function consultarPago(string $paymentId): array
    {
        $this->exigirHabilitado();

        $respuesta = $this->cliente()
            ->get(self::API_BASE.'/v1/payments/'.rawurlencode($paymentId));

        $this->exigirOk($respuesta, 'No se pudo consultar el pago en Mercado Pago.');

        return $respuesta->json();
    }

    /**
     * Traduce el `status` de Mercado Pago al estado del PAGO de la BD.
     *
     * `authorized`/`pending`/`in_process`/`in_mediation` = MP retiene
     * el pago sin resolverlo: se refleja como `en_proceso` (NO cuenta
     * en el saldo y bloquea un nuevo intento de pago).
     */
    public function estadoDesdeMp(?string $statusMp): string
    {
        return match ($statusMp) {
            'approved' => Pago::ESTADO_APROBADO,
            'rejected', 'cancelled', 'refunded', 'charged_back' => Pago::ESTADO_RECHAZADO,
            'authorized', 'pending', 'in_process', 'in_mediation' => Pago::ESTADO_EN_PROCESO,
            default => Pago::ESTADO_PENDIENTE,
        };
    }

    /**
     * Pagos de Mercado Pago asociados a una referencia externa (el
     * `id` de nuestra fila PAGO). Es la red de seguridad del alta de
     * pago: antes de ofrecer un `init_point` nuevo se pregunta a MP si
     * ya cobró (el webhook puede haberse perdido), y el front lo usa
     * para reconciliar al volver del checkout.
     *
     * @return list<array<string, mixed>> vacío si MP no tiene pagos
     *                                    para esa referencia
     *
     * @throws ApiException si MP responde error (502)
     */
    public function pagosPorReferenciaExterna(string $referenciaExterna): array
    {
        $this->exigirHabilitado();

        $respuesta = $this->cliente()
            ->get(self::API_BASE.'/v1/payments/search', [
                'external_reference' => $referenciaExterna,
                'sort' => 'date_created',
                'criteria' => 'asc',
            ]);

        $this->exigirOk($respuesta, 'No se pudo consultar el pago en Mercado Pago.');

        $resultados = $respuesta->json('results');

        return is_array($resultados) ? array_values($resultados) : [];
    }

    // ==================== FIRMA ====================

    /**
     * Valida la firma `x-signature` de la notificación (HMAC-SHA256
     * sobre el manifest `id:...;request-id:...;ts:...;`).
     *
     * MP manda el header como `ts=...,v1=...` (coma; el SDK oficial
     * también acepta `;`) y el `data.id` en la query string. Sin
     * `MP_WEBHOOK_SECRET` configurado se rechaza (no se puede
     * verificar: mejor no procesar).
     *
     * @param  array<string, string>  $headers  ej. $request->headers->all() con valores string
     * @param  array<string, string>  $query  ej. $request->query()
     */
    public function validarFirma(array $headers, array $query): bool
    {
        $secret = config('services.mercadopago.webhook_secret');

        if (empty($secret)) {
            return false;
        }

        $firma = $this->header($headers, 'x-signature');

        if ($firma === null) {
            return false;
        }

        $partes = [];

        // MP separa los pares con coma (`ts=...,v1=...`); el punto y
        // coma es equivalente. Los valores (ts, hash) no contienen
        // ninguno de los dos, así que normalizar es seguro.
        foreach (preg_split('/[,;]/', $firma) as $par) {
            [$clave, $valor] = array_pad(explode('=', trim($par), 2), 2, null);

            if ($clave !== null && $valor !== null) {
                $partes[$clave] = $valor;
            }
        }

        $ts = $partes['ts'] ?? null;
        $v1 = $partes['v1'] ?? null;

        if ($ts === null || $v1 === null) {
            return false;
        }

        // El manifest incluye los datos que llegaron en la query.
        // OJO: PHP convierte `data.id` en `data_id` (parse_str).
        $dataId = $query['data.id'] ?? $query['data_id'] ?? null;
        $manifest = '';

        if (! empty($dataId)) {
            $manifest .= 'id:'.$dataId.';';
        }

        $requestId = $this->header($headers, 'x-request-id');

        if ($requestId !== null) {
            $manifest .= 'request-id:'.$requestId.';';
        }

        $manifest .= 'ts:'.$ts.';';

        $esperado = hash_hmac('sha256', $manifest, $secret);

        return hash_equals($esperado, $v1);
    }

    // ==================== INTERNAS ====================

    private function cliente(): PendingRequest
    {
        return Http::withToken(config('services.mercadopago.access_token'))
            ->acceptJson()
            ->timeout(15);
    }

    /**
     * @throws ApiException si la respuesta de MP no es 2xx
     */
    private function exigirOk(Response $respuesta, string $mensaje): void
    {
        if ($respuesta->failed()) {
            throw new ApiException(502, $mensaje);
        }
    }

    /**
     * @param  array<string, string>  $headers
     */
    private function header(array $headers, string $nombre): ?string
    {
        foreach ($headers as $clave => $valor) {
            if (strtolower((string) $clave) === $nombre) {
                return is_array($valor) ? (string) reset($valor) : (string) $valor;
            }
        }

        return null;
    }
}
