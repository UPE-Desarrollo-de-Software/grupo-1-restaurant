<?php

namespace App\UseCases\Reservas;

use App\Models\DetallePreOrden;
use App\Services\PreordenService;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Collection;

/**
 * CASO DE USO: editar la pre-orden de una reserva por id
 * (PUT /api/reservas/{id}/preordenes, permiso gestionar_reservas:
 * el mozo/gerente también puede rearmar el carrito). Merge por
 * `plato_id`; solo mientras la reserva siga `pendiente` (422 después).
 *
 * @throws ModelNotFoundException la reserva no existe (404)
 * @throws \Exception reserva no pendiente, plato inexistente o
 *                    inactivo, cantidad inválida (422)
 */
class ActualizarPreordenUseCase
{
    public function __construct(private PreordenService $preordenes) {}

    /**
     * @param  array<int, array{plato_id: int|string, cantidad: int|string}>  $lineas
     * @return Collection<int, DetallePreOrden>
     */
    public function __invoke(int $id, array $lineas): Collection
    {
        return $this->preordenes->actualizarPorReserva($id, $lineas);
    }
}
