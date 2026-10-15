<?php

namespace App\UseCases\Configuracion;

use App\Services\ConfiguracionService;

/**
 * CASO DE USO: leer la configuración del restaurante
 * (GET /api/configuracion: el aforo `capacidad_total` de PARAMETRO).
 *
 * @return array{capacidad_total: int}
 */
class ObtenerConfiguracionUseCase
{
    public function __construct(private ConfiguracionService $configuracion) {}

    /**
     * @return array{capacidad_total: int}
     */
    public function __invoke(): array
    {
        return $this->configuracion->obtener();
    }
}
