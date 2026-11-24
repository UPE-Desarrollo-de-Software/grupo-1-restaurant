<?php

namespace App\UseCases\Mesas;

use App\Services\MesaService;
use App\Services\PagoService;

/**
 * CASO DE USO: cuenta dividida de la mesa en PARTES por pedido raíz
 * (GET /api/mesas/{id}/cuenta y GET /cliente/cuenta; el comensal
 * identifica SU parte con el pedido_id que guardó en su dispositivo).
 *
 * Además de la cuenta, enriquece cada mesa con el estado de los pagos
 * (DER v3.2 — Mercado Pago): `saldo` (total / pagado / pendiente por
 * parte) para que el mozo vea "Pagado por MP" y cuánto falta, y
 * `pagos` (historial). Las mesas del grupo llevan lo mismo.
 *
 * @return array<string, mixed>
 */
class ObtenerCuentaMesaUseCase
{
    public function __construct(
        private MesaService $mesas,
        private PagoService $pagos,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function __invoke(int $mesaId): array
    {
        return $this->conPagos($this->mesas->cuenta($mesaId));
    }

    /**
     * @param  array<string, mixed>  $cuenta
     * @return array<string, mixed>
     */
    private function conPagos(array $cuenta): array
    {
        $cuenta['saldo'] = $this->pagos->saldo($cuenta);
        $cuenta['pagos'] = $this->pagos->historial((int) $cuenta['mesa_id']);

        foreach ($cuenta['grupo'] ?? [] as $indice => $hermana) {
            $cuenta['grupo'][$indice] = $this->conPagos($hermana);
        }

        return $cuenta;
    }
}
