<?php

namespace App\UseCases\Platos;

use App\Services\PlatoService;
use Illuminate\Database\Eloquent\ModelNotFoundException;

/**
 * CASO DE USO: eliminar un plato (DELETE /api/platos/{id}).
 * null = no existe (contrato 200 + message).
 */
class EliminarPlatoUseCase
{
    public function __construct(private PlatoService $platos) {}

    public function __invoke(int $id): bool
    {
        try {
            $this->platos->eliminar($id);

            return true;
        } catch (ModelNotFoundException) {
            return false;
        }
    }
}
