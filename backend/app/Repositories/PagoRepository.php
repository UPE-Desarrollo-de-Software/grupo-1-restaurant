<?php

namespace App\Repositories;

use App\Models\Pago;
use Illuminate\Support\Collection;

/**
 * Puerto de persistencia de PAGOS (capa Repository — DER v3.2).
 *
 * La idempotencia del webhook vive acá: `porMpPaymentId` busca por el
 * `mp_payment_id` UNIQUE de Mercado Pago para que una notificación
 * repetida no duplique el pago.
 */
interface PagoRepository
{
    /**
     * @param  array<string, mixed>  $datos
     */
    public function crear(array $datos): Pago;

    /**
     * Pago por id; null si no existe.
     */
    public function porId(int $id): ?Pago;

    /**
     * Pago por `mp_preference_id` (para reconciliar el retorno del
     * checkout con la fila creada); null si no existe.
     */
    public function porPreferenceId(string $mpPreferenceId): ?Pago;

    /**
     * Pago por `mp_payment_id` UNIQUE (idempotencia del webhook);
     * null si no existe.
     */
    public function porMpPaymentId(string $mpPaymentId): ?Pago;

    /**
     * Pagos APROBADOS de la visita de una mesa (base del saldo:
     * pendiente = total_vigente − Σ aprobados).
     *
     * @return Collection<int, Pago>
     */
    public function aprobadosDeMesa(int $mesaId): Collection;

    /**
     * Pagos APROBADOS "mi parte" de un pedido raíz (lo que ese
     * comensal ya abonó por su parte).
     *
     * @return Collection<int, Pago>
     */
    public function aprobadosDePedido(int $pedidoId): Collection;

    /**
     * Todos los pagos de la visita de una mesa (historial para el
     * comensal y para el resumen del mozo), ordenados por fecha.
     *
     * @return Collection<int, Pago>
     */
    public function deMesa(int $mesaId): Collection;

    /**
     * Pagos APROBADOS en un período, agrupados por `medio_pago`
     * (desglose de cobros del dashboard).
     *
     * @return array<string, array{cantidad: int, total: float}>
     */
    public function aprobadosEntre(string $desde, string $hasta): array;
}
