<?php

namespace App\UseCases\Configuracion;

use App\Services\ConfiguracionService;

/**
 * CASO DE USO: leer la configuración del restaurante
 * (GET /api/configuracion: la composición CONFIG_MESA, el aforo
 * derivado y el tope de mesas).
 *
 * @return array{config_mesas: list<array{cantidad: int, capacidad: int}>, aforo: int, mesas_maximas: int}
 */
class ObtenerConfiguracionUseCase
{
    public function __construct(private ConfiguracionService $configuracion) {}

    /**
     * @return array{config_mesas: list<array{cantidad: int, capacidad: int}>, aforo: int, mesas_maximas: int}
     */
    public function __invoke(): array
    {
        return $this->configuracion->obtener();
    }
}
