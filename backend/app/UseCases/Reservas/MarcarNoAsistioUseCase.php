<?php

namespace App\UseCases\Reservas;

use App\Models\Reserva;
use App\Services\ReservaService;
use Illuminate\Database\Eloquent\ModelNotFoundException;

/**
 * CASO DE USO: marcar inasistencia (PATCH
 * /api/reservas/{id}/inasistio, permiso gestionar_reservas). Solo
 * pendientes y ya pasada la hora (nadie puede saber que el cliente no
 * vino antes del horario).
 *
 * @throws \Exception no pendiente o aún no llegó la hora (controller responde 422)
 * @throws ModelNotFoundException no existe (404)
 */
class MarcarNoAsistioUseCase
{
    public function __construct(private ReservaService $reservas) {}

    public function __invoke(int $id): Reserva
    {
        return $this->reservas->marcarNoAsistio($id);
    }
}
