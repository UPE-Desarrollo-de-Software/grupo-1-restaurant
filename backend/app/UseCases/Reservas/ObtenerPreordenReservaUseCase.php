<?php

namespace App\UseCases\Reservas;

use App\Models\DetallePreOrden;
use App\Services\PreordenService;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Collection;

/**
 * CASO DE USO: ver la pre-orden de una reserva por id
 * (GET /api/reservas/{id}/preordenes, permiso gestionar_reservas:
 * el mozo/gerente la ve desde la agenda — que ya la trae incluida —
 * o desde el detalle puntual).
 *
 * @throws ModelNotFoundException la reserva no existe (404)
 */
class ObtenerPreordenReservaUseCase
{
    public function __construct(private PreordenService $preordenes) {}

    /**
     * @return Collection<int, DetallePreOrden>
     */
    public function __invoke(int $id): Collection
    {
        return $this->preordenes->obtenerPorReserva($id);
    }
}
