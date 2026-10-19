<?php

namespace App\UseCases\Reservas;

use App\Models\Reserva;
use App\Services\ReservaService;
use Illuminate\Database\Eloquent\ModelNotFoundException;

/**
 * CASO DE USO: finalizar una reserva (PATCH /api/reservas/{id}/finalizar,
 * permiso gestionar_reservas). Solo pendientes y ya pasada la hora.
 *
 * @throws \Exception no pendiente o aún no llegó la hora (controller responde 422)
 * @throws ModelNotFoundException no existe (404)
 */
class FinalizarReservaUseCase
{
    public function __construct(private ReservaService $reservas) {}

    public function __invoke(int $id): Reserva
    {
        return $this->reservas->finalizar($id);
    }
}
