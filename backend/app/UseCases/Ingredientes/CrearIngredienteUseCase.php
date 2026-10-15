<?php

namespace App\UseCases\Ingredientes;

use App\Models\Ingrediente;
use App\Services\IngredienteService;

/**
 * CASO DE USO: crear un ingrediente (POST /api/ingredientes,
 * permiso gestionar_ingredientes).
 */
class CrearIngredienteUseCase
{
    public function __construct(private IngredienteService $ingredientes) {}

    /**
     * @param  array<string, mixed>  $datos
     */
    public function __invoke(array $datos): Ingrediente
    {
        return $this->ingredientes->crear($datos);
    }
}
