<?php

namespace App\UseCases\Pagos;

use App\Exceptions\ApiException;
use App\Services\MercadoPagoService;
use App\Services\PagoService;

/**
 * CASO DE USO: procesar una notificación de Mercado Pago
 * (POST/GET /api/webhooks/mercado-pago — vía pública).
 *
 * La notificación solo IDENTIFICA el pago: el estado real se consulta
 * en la API de MP (fuente de verdad) y se valida la firma HMAC
 * `x-signature` antes de tocar nada. Idempotente por
 * `mp_payment_id` UNIQUE.
 *
 * @return array<string, mixed>
 */
class ProcesarNotificacionPagoUseCase
{
    public function __construct(
        private PagoService $pagos,
        private MercadoPagoService $mercadoPago,
    ) {}

    /**
     * @param  array<string, string>  $headers  headers del request (con x-signature)
     * @param  array<string, string>  $query  query string (data.id, type…)
     * @param  array<string, mixed>  $body  body JSON del webhook
     * @return array<string, mixed>
     *
     * @throws ApiException firma inválida (401) · ApiException (502) MP inaccesible
     */
    public function __invoke(array $headers, array $query, array $body): array
    {
        if (! $this->mercadoPago->habilitado()) {
            throw new ApiException(503, 'Los pagos con Mercado Pago no están habilitados en este momento.');
        }

        if (! $this->mercadoPago->validarFirma($headers, $query)) {
            throw new ApiException(401, 'Firma de notificación inválida.');
        }

        // El topic tiene que ser de pago: el resto (merchant_order…)
        // se acepta sin procesar para que MP no reintente.
        $tipo = (string) ($query['type'] ?? $query['topic'] ?? ($body['type'] ?? ''));

        if ($tipo !== '' && $tipo !== 'payment') {
            return ['procesado' => false, 'motivo' => 'notificacion_ignorada'];
        }

        // PHP normaliza `data.id` de la query a `data_id`
        // (parse_str reemplaza los puntos por guiones bajos).
        $paymentId = (string) ($query['data.id']
            ?? $query['data_id']
            ?? $query['id']
            ?? ($body['data']['id'] ?? ''));

        if ($paymentId === '') {
            return ['procesado' => false, 'motivo' => 'sin_pago'];
        }

        $pago = $this->pagos->procesarNotificacion($paymentId);

        return [
            'procesado' => true,
            'pago_id' => $pago?->id,
            'estado' => $pago?->estado,
        ];
    }
}
