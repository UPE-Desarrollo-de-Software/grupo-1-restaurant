<?php

namespace App\UseCases\Categorias;

use App\Models\Categoria;
use App\Services\CategoriaService;
use Illuminate\Database\Eloquent\ModelNotFoundException;

/**
 * CASO DE USO: actualizar una categoría (PUT /api/categorias/{id}).
 * null = no existe (contrato 200 + message del API).
 */
class ActualizarCategoriaUseCase
{
    public function __construct(private CategoriaService $categorias) {}

    /**
     * @param  array<string, mixed>  $datos
     */
    public function __invoke(int $id, array $datos): ?Categoria
    {
        try {
            return $this->categorias->actualizar($id, $datos);
        } catch (ModelNotFoundException) {
            return null;
        }
    }
}
