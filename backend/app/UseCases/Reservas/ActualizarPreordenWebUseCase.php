<?php

namespace App\UseCases\Reservas;

use App\Models\DetallePreOrden;
use App\Services\PreordenService;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Collection;

/**
 * CASO DE USO: editar la pre-orden con el PIN de la reserva
 * (PUT /api/cliente/reservas/{codigo}/preordenes, público con
 * throttle). Merge por `plato_id`; solo mientras la reserva siga
 * `pendiente` (422 después).
 *
 * @throws ModelNotFoundException no hay ninguna reserva con ese PIN
 *                                (el controller responde 401, igual
 *                                que /acceso)
 * @throws \Exception reserva no pendiente, plato inexistente o
 *                    inactivo, cantidad inválida (422)
 */
class ActualizarPreordenWebUseCase
{
    public function __construct(private PreordenService $preordenes) {}

    /**
     * @param  array<int, array{plato_id: int|string, cantidad: int|string}>  $lineas
     * @return Collection<int, DetallePreOrden>
     */
    public function __invoke(string $codigo, array $lineas): Collection
    {
        return $this->preordenes->actualizarPorCodigo($codigo, $lineas);
    }
}
