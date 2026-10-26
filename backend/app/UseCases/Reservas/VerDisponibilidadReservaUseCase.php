<?php

namespace App\UseCases\Reservas;

use App\Services\ReservaService;

/**
 * CASO DE USO: consultar la disponibilidad de un horario (GET
 * /api/cliente/reservas/disponibilidad, público con throttle).
 *
 * Reemplaza al antiguo mapa de mesas: como la reserva no elige mesa,
 * lo que se muestra es qué CAPACIDADES quedan libres para ese
 * intervalo (CONFIG_MESA − holds pendientes solapados).
 */
class VerDisponibilidadReservaUseCase
{
    public function __construct(private ReservaService $reservas) {}

    /**
     * @param  string  $fecha  YYYY-MM-DD
     * @param  string  $hora  H:i o H:i:s
     * @return array{fecha: string, inicio: string, fin: string, disponible: list<array{capacidad: int, cantidad: int}>, aforo_disponible: int}
     */
    public function __invoke(string $fecha, string $hora): array
    {
        return $this->reservas->disponibilidad($fecha, $hora);
    }
}
