<?php

namespace App\UseCases\Reservas;

use App\Models\Reserva;
use App\Services\ReservaService;
use Illuminate\Database\Eloquent\ModelNotFoundException;

/**
 * CASO DE USO: cancelar una reserva (PATCH /api/reservas/{id}/cancelar,
 * permiso gestionar_reservas). Solo de estado pendiente; si era de
 * hoy, la mesa vuelve a 'libre'.
 *
 * @throws \Exception reserva no pendiente (controller responde 422)
 * @throws ModelNotFoundException no existe (404)
 */
class CancelarReservaUseCase
{
    public function __construct(private ReservaService $reservas) {}

    public function __invoke(int $id): Reserva
    {
        return $this->reservas->cancelar($id);
    }
}
