<?php

namespace App\UseCases\Configuracion;

use App\Services\DisponibilidadReservaService;

/**
 * CASO DE USO: leer la disponibilidad horaria de reservas
 * (GET /api/configuracion/disponibilidad).
 *
 * Devuelve la ventana vigente (la que el gerente haya guardado en
 * runtime, o los defaults del config) junto con la grilla de turnos
 * que se deriva de ella.
 */
class ObtenerDisponibilidadReservasUseCase
{
    public function __construct(private DisponibilidadReservaService $disponibilidad) {}

    /**
     * @return array{hora_inicio: string, hora_fin: string, intervalo_minutos: int, anticipacion_horas: int, slots: list<string>, total_slots: int}
     */
    public function __invoke(): array
    {
        return $this->disponibilidad->obtener();
    }
}
