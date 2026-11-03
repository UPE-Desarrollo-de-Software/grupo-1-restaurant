<?php

namespace App\UseCases\Reservas;

use App\Services\ReservaService;

/**
 * CASO DE USO: consultar la grilla de horarios de un día (GET
 * /api/cliente/reservas/disponibilidad-dia, público con throttle).
 *
 * Devuelve un slot por cada turno fijo (12:00–23:00 cada 30 min) con
 * el aforo que queda libre para su intervalo.
 */
class VerDisponibilidadDiaReservaUseCase
{
    public function __construct(private ReservaService $reservas) {}

    /**
     * @param  string  $fecha  YYYY-MM-DD
     * @return array{fecha: string, slots: list<array{hora: string, inicio: string, fin: string, disponible: list<array{capacidad: int, cantidad: int}>, aforo_disponible: int}>}
     */
    public function __invoke(string $fecha): array
    {
        return $this->reservas->disponibilidadDia($fecha);
    }
}
