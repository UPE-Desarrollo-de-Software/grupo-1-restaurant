<?php

namespace App\UseCases\Reservas;

use App\Models\Reserva;
use App\Services\ReservaService;

/**
 * CASO DE USO: crear una reserva DESDE EL RESTAURANTE (POST
 * /api/reservas, permiso gestionar_reservas).
 *
 * El empleado NO elige mesa: pide personas + horario y el sistema
 * asigna la combinación de capacidades del inventario (igual que la
 * reserva pública).
 *
 * @throws \Exception lead time o sin inventario para el horario (controller responde 422)
 */
class CrearReservaUseCase
{
    public function __construct(private ReservaService $reservas) {}

    /**
     * @param  array<string, mixed>  $datos
     */
    public function __invoke(array $datos): Reserva
    {
        return $this->reservas->crear($datos);
    }
}
