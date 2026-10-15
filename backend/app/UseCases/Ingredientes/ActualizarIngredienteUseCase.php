<?php

namespace App\UseCases\Ingredientes;

use App\Models\Ingrediente;
use App\Services\IngredienteService;

/**
 * CASO DE USO: actualizar un ingrediente (PUT /api/ingredientes/{id}).
 * Si no existe, ModelNotFoundException → 404.
 */
class ActualizarIngredienteUseCase
{
    public function __construct(private IngredienteService $ingredientes) {}

    /**
     * @param  array<string, mixed>  $datos
     */
    public function __invoke(int $id, array $datos): Ingrediente
    {
        return $this->ingredientes->actualizar($id, $datos);
    }
}
