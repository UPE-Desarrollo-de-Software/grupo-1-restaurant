<?php

namespace App\UseCases\Configuracion;

use App\Services\ConfiguracionService;

/**
 * CASO DE USO: actualizar la configuración (PUT /api/configuracion,
 * permiso gestionar_mesas). El aforo no puede quedar por debajo de la
 * capacidad que ya ocupan las mesas vivas.
 *
 * @param  array<string, mixed>  $datos
 * @return array{capacidad_total: int}
 *
 * @throws \Exception (controller responde 422)
 */
class ActualizarConfiguracionUseCase
{
    public function __construct(private ConfiguracionService $configuracion) {}

    /**
     * @param  array<string, mixed>  $datos
     * @return array{capacidad_total: int}
     */
    public function __invoke(array $datos): array
    {
        return $this->configuracion->actualizar($datos);
    }
}
