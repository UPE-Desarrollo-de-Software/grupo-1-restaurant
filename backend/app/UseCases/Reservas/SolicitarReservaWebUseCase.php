<?php

namespace App\UseCases\Reservas;

use App\Models\Reserva;
use App\Services\ReservaService;

/**
 * CASO DE USO: crear una reserva DEL CLIENTE POR LA WEB (POST
 * /api/cliente/reservas, público con throttle). Si no elige mesa, la
 * crea el "mozo virtual" (el sistema) validando el aforo.
 *
 * @throws \Exception lead time, aforo o conflicto (controller responde 422)
 */
class SolicitarReservaWebUseCase
{
    public function __construct(private ReservaService $reservas) {}

    /**
     * @param  array<string, mixed>  $datos
     */
    public function __invoke(array $datos): Reserva
    {
        return $this->reservas->crear($datos, esPublico: true);
    }
}
