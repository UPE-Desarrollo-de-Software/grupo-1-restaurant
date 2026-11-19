<?php

namespace App\UseCases\Pagos;

use App\Models\Mesa;
use App\Services\PagoService;

/**
 * CASO DE USO: detalle de un pago con Mercado Pago para el comensal
 * (GET /api/cliente/pagos/{pago}/detalle).
 *
 * Devuelve el JSON crudo que MP devolvió al acreditar el pago
 * (`fee_details` con cada comisión, `transaction_details` con el neto
 * acreditado, etc.), persistido en `pagos.mp_detalle`. El pago tiene
 * que ser de la visita que lo pide; no consulta la API de MP.
 *
 * @return array{pago_id: int, monto: float, estado: string, medio_pago: string, mp_detalle: array<string, mixed>|null}
 */
class ObtenerDetallePagoUseCase
{
    public function __construct(
        private PagoService $pagos,
    ) {}

    /**
     * @throws \Exception (422) no existe, de otra mesa o es efectivo
     */
    public function __invoke(Mesa $mesa, int $pagoId): array
    {
        return $this->pagos->detalle($pagoId, (int) $mesa->id);
    }
}
