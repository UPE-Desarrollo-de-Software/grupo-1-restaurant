<?php

namespace App\UseCases\Categorias;

use App\Models\Categoria;
use App\Services\CategoriaService;

/**
 * CASO DE USO: crear una categoría (POST /api/categorias,
 * permiso gestionar_categorias).
 */
class CrearCategoriaUseCase
{
    public function __construct(private CategoriaService $categorias) {}

    /**
     * @param  array<string, mixed>  $datos
     */
    public function __invoke(array $datos): Categoria
    {
        return $this->categorias->crear($datos);
    }
}
