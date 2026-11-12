<?php

namespace App\UseCases\Reservas;

use App\Models\DetallePreOrden;
use App\Services\PreordenService;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Collection;

/**
 * CASO DE USO: ver la pre-orden de la reserva con su PIN de 4
 * dígitos (GET /api/cliente/reservas/{codigo}/preordenes, público
 * con throttle: precedente de POST /acceso).
 *
 * @throws ModelNotFoundException no hay ninguna reserva con ese PIN
 *                                (el controller responde 401, igual
 *                                que /acceso)
 */
class ObtenerPreordenUseCase
{
    public function __construct(private PreordenService $preordenes) {}

    /**
     * @return Collection<int, DetallePreOrden>
     */
    public function __invoke(string $codigo): Collection
    {
        return $this->preordenes->obtenerPorCodigo($codigo);
    }
}
