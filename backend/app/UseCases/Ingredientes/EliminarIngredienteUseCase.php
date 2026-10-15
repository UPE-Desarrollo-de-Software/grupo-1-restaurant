<?php

namespace App\UseCases\Ingredientes;

use App\Services\IngredienteService;

/**
 * CASO DE USO: eliminar un ingrediente (DELETE /api/ingredientes/{id}).
 * Primero se desprende de todos los platos (pivot) y recién se da de
 * baja. Si no existe, ModelNotFoundException → 404.
 */
class EliminarIngredienteUseCase
{
    public function __construct(private IngredienteService $ingredientes) {}

    public function __invoke(int $id): void
    {
        $this->ingredientes->eliminar($id);
    }
}
