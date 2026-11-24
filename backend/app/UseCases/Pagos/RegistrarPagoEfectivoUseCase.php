<?php

namespace App\UseCases\Pagos;

use App\Models\Mesa;
use App\Services\MesaService;
use App\Services\PagoService;

/**
 * CASO DE USO: registrar un cobro en EFECTIVO
 * (POST /api/mesas/{mesa}/pagos, permiso tomar_pedidos).
 *
 * El mozo cobra la cuenta al cerrar la visita: el pago nace
 * `aprobado` con `medio_pago = efectivo` (no pasa por Mercado Pago).
 * El monto lo manda el mozo (saldo precargado y editable) pero se
 * valida server-side contra el saldo vigente.
 *
 * @return array{pago: array<string, mixed>, saldo: array<string, mixed>}
 */
class RegistrarPagoEfectivoUseCase
{
    public function __construct(
        private MesaService $mesas,
        private PagoService $pagos,
    ) {}

    /**
     * @return array{pago: array<string, mixed>, saldo: array<string, mixed>}
     *
     * @throws \Exception (422) monto inválido o cuenta ya saldada
     */
    public function __invoke(Mesa $mesa, float $monto): array
    {
        $cuenta = $this->mesas->cuenta($mesa->id);

        $pago = $this->pagos->registrarEfectivo($cuenta, $monto);

        return [
            'pago' => [
                'id' => $pago->id,
                'tipo' => $pago->tipo,
                'monto' => round((float) $pago->monto, 2),
                'estado' => $pago->estado,
                'medio_pago' => $pago->medio_pago,
                'fecha' => $pago->fecha?->toIso8601String(),
            ],
            'saldo' => $this->pagos->saldo($cuenta),
        ];
    }
}
