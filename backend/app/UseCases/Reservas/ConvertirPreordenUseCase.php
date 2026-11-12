<?php

namespace App\UseCases\Reservas;

use App\Models\Pedido;
use App\Services\PreordenService;
use Illuminate\Database\Eloquent\ModelNotFoundException;

/**
 * CASO DE USO: respaldo MANUAL de la conversión de la pre-orden
 * (POST /api/reservas/{id}/preordenes/convertir, permiso
 * gestionar_reservas). Sirve si el mozo creó la mesa sin pasar
 * `reserva_id`: convierte a mano en la mesa indicada. En el flujo
 * normal nadie lo llama (la conversión es automática: quien llega
 * último convierte).
 *
 * @throws ModelNotFoundException la reserva no existe (404)
 * @throws \Exception reserva cancelada/no_asistio o doble
 *                    conversión (422)
 */
class ConvertirPreordenUseCase
{
    public function __construct(private PreordenService $preordenes) {}

    public function __invoke(int $id, int $mesaId): Pedido
    {
        $pedido = $this->preordenes->convertirPreOrdenEnPedido($id, $mesaId);

        if (! $pedido) {
            // La conversión automática es un no-op ante la repetición,
            // pero A MANO solo se convierte una vez: doble → 422.
            throw new \Exception('La pre-orden de la reserva ya fue convertida en pedido (o no tiene líneas pendientes).');
        }

        return $pedido;
    }
}
