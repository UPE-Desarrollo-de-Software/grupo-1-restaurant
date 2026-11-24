<?php

namespace App\UseCases\Configuracion;

use App\Services\DisponibilidadReservaService;

/**
 * CASO DE USO: actualizar la disponibilidad horaria de reservas
 * (PUT /api/configuracion/disponibilidad, permiso gestionar_mesas).
 *
 * El cambio NO se persiste en la base de datos: vive en el archivo de
 * runtime que administra DisponibilidadReservaService.
 */
class ActualizarDisponibilidadReservasUseCase
{
    public function __construct(private DisponibilidadReservaService $disponibilidad) {}

    /**
     * @param  array{hora_inicio: string, hora_fin: string, intervalo_minutos: int}  $datos
     * @return array{hora_inicio: string, hora_fin: string, intervalo_minutos: int, anticipacion_horas: int, slots: list<string>, total_slots: int}
     *
     * @throws \Exception datos inválidos (el controller responde 422)
     */
    public function __invoke(array $datos): array
    {
        return $this->disponibilidad->actualizar($datos);
    }
}
