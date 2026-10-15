<?php

namespace App\UseCases\Platos;

use App\Models\Plato;
use App\Services\PlatoService;
use Illuminate\Database\Eloquent\ModelNotFoundException;

/**
 * CASO DE USO: obtener un plato con sus ingredientes
 * (GET /api/platos/{id}). null = no existe (contrato 200 + message).
 */
class ObtenerPlatoUseCase
{
    public function __construct(private PlatoService $platos) {}

    public function __invoke(int $id): ?Plato
    {
        try {
            return $this->platos->obtenerConIngredientes($id);
        } catch (ModelNotFoundException) {
            return null;
        }
    }
}
