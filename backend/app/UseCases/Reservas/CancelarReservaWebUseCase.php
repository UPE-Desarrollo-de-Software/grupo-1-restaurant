<?php

namespace App\UseCases\Reservas;

use App\Models\Reserva;
use App\Services\ReservaService;
use Illuminate\Support\Collection;

/**
 * CASO DE USO: cancelar reservas del cliente con el codigo_acceso de
 * la mesa (POST /api/cliente/reservas/cancelar, público con throttle
 * estricto). Cancela TODAS las reservas pendientes de esa mesa (el
 * código identifica la mesa, no una reserva puntual).
 *
 *
 * @return Collection<int, Reserva>
 *
 * @throws \Exception sin reservas pendientes para ese código
 *                    (controller responde 422)
 */
class CancelarReservaWebUseCase
{
    public function __construct(private ReservaService $reservas) {}

    /**
     * @return Collection<int, Reserva>
     */
    public function __invoke(string $codigo): Collection
    {
        return $this->reservas->cancelarPorCodigoMesa($codigo);
    }
}
