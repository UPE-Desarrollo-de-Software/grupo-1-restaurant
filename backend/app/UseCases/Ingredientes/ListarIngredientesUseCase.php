<?php

namespace App\UseCases\Ingredientes;

use App\Models\Ingrediente;
use App\Services\IngredienteService;
use Illuminate\Support\Collection;

/**
 * CASO DE USO: listar el catálogo de ingredientes
 * (GET /api/ingredientes).
 */
class ListarIngredientesUseCase
{
    public function __construct(private IngredienteService $ingredientes) {}

    /**
     * @return Collection<int, Ingrediente>
     */
    public function __invoke(): Collection
    {
        return $this->ingredientes->obtenerTodos();
    }
}
