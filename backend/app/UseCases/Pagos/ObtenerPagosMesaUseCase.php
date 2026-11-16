<?php

namespace App\UseCases\Pagos;

use App\Models\Mesa;
use App\Services\MercadoPagoService;
use App\Services\MesaService;
use App\Services\PagoService;

/**
 * CASO DE USO: saldo + historial de pagos de la visita del comensal
 * (GET /api/cliente/pagos).
 *
 * Devuelve el feature flag (`habilitado`), el saldo de la cuenta
 * (total / pagado / pendiente por parte) y los pagos registrados.
 *
 * @return array<string, mixed>
 */
class ObtenerPagosMesaUseCase
{
    public function __construct(
        private MesaService $mesas,
        private PagoService $pagos,
        private MercadoPagoService $mercadoPago,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function __invoke(Mesa $mesa): array
    {
        $cuenta = $this->mesas->cuenta($mesa->id);

        return [
            'habilitado' => $this->mercadoPago->habilitado(),
            'saldo' => $this->pagos->saldo($cuenta),
            'pagos' => $this->pagos->historial($mesa->id),
        ];
    }
}
