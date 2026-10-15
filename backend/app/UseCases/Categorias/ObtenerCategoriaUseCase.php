<?php

namespace App\UseCases\Categorias;

use App\Models\Categoria;
use App\Services\CategoriaService;
use Illuminate\Database\Eloquent\ModelNotFoundException;

/**
 * CASO DE USO: obtener una categoría por id (GET /api/categorias/{id}).
 * Devuelve null cuando no existe (contrato 200 + message del API, en
 * vez de 404: convención de la mayoría de los recursos).
 */
class ObtenerCategoriaUseCase
{
    public function __construct(private CategoriaService $categorias) {}

    public function __invoke(int $id): ?Categoria
    {
        try {
            return $this->categorias->obtenerPorId($id);
        } catch (ModelNotFoundException) {
            return null;
        }
    }
}
