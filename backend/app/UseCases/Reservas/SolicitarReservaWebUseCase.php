<?php

namespace App\UseCases\Reservas;

use App\Models\Reserva;
use App\Services\ReservaService;

/**
 * CASO DE USO: crear una reserva DEL CLIENTE POR LA WEB (POST
 * /api/cliente/reservas, público con throttle). El sistema elige la
 * combinación de capacidades contra el inventario; no hay mesa que
 * elegir ni "mozo virtual".
 *
 * @throws \Exception lead time o sin inventario para el horario (controller responde 422)
 */
class SolicitarReservaWebUseCase
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
