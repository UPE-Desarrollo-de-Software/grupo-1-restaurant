<?php

namespace App\UseCases\Platos;

use App\Models\Plato;
use App\Services\PlatoService;

/**
 * CASO DE USO: crear un plato con sus ingredientes
 * (POST /api/platos, permiso gestionar_platos).
 */
class CrearPlatoUseCase
{
    public function __construct(private PlatoService $platos) {}

    /**
     * @param  array<string, mixed>  $datos
     */
    public function __invoke(array $datos): Plato
    {
        return $this->platos->crear($datos);
    }
}
