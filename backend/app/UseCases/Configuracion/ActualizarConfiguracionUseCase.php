<?php

namespace App\UseCases\Configuracion;

use App\Services\ConfiguracionService;

/**
 * CASO DE USO: actualizar la configuración (PUT /api/configuracion,
 * permiso gestionar_mesas). REPLACE-ALL de las piezas CONFIG_MESA: el
 * aforo no puede quedar por debajo de lo que ya ocupan las mesas
 * vivas ni el tope de mesas por debajo de las vivas.
 *
 * @param  array{config_mesas: list<array{cantidad: int, capacidad: int}>}  $datos
 * @return array{config_mesas: list<array{cantidad: int, capacidad: int}>, aforo: int, mesas_maximas: int}
 *
 * @throws \Exception (controller responde 422)
 */
class ActualizarConfiguracionUseCase
{
    public function __construct(private ConfiguracionService $configuracion) {}

    /**
     * @param  array{config_mesas: list<array{cantidad: int, capacidad: int}>}  $datos
     * @return array{config_mesas: list<array{cantidad: int, capacidad: int}>, aforo: int, mesas_maximas: int}
     */
    public function __invoke(array $datos): array
    {
        return $this->configuracion->actualizar($datos);
    }
}
