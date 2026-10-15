<?php

namespace App\UseCases\Categorias;

use App\Services\CategoriaService;
use Illuminate\Database\Eloquent\ModelNotFoundException;

/**
 * CASO DE USO: eliminar una categoría (DELETE /api/categorias/{id}).
 * Si tiene platos, la FK tira un 4511 y el controller responde 422
 * (no hay cascade en platos.categoria_id).
 */
class EliminarCategoriaUseCase
{
    public function __construct(private CategoriaService $categorias) {}

    public function __invoke(int $id): bool
    {
        try {
            $this->categorias->eliminar($id);

            return true;
        } catch (ModelNotFoundException) {
            return false;
        }
    }
}
