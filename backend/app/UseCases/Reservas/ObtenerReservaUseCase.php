<?php

namespace App\UseCases\Reservas;

use App\Models\Reserva;
use App\Services\ReservaService;
use Illuminate\Database\Eloquent\ModelNotFoundException;

/**
 * CASO DE USO: detalle de una reserva con su mesa
 * (GET /api/reservas/{id}, permiso gestionar_reservas).
 *
 * @throws ModelNotFoundException no existe (404)
 */
class ObtenerReservaUseCase
{
    public function __construct(private ReservaService $reservas) {}

    public function __invoke(int $id): Reserva
    {
        return $this->reservas->obtenerPorId($id);
    }
}
