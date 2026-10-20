<?php

namespace App\UseCases\Categorias;

use App\Models\Categoria;
use App\Services\CategoriaService;
use Illuminate\Support\Collection;

/**
 * CASO DE USO: listar las categorías activas de la carta
 * (GET /api/categorias).
 */
class ListarCategoriasActivasUseCase
{
    public function __construct(private CategoriaService $categorias) {}

    /**
     * @return Collection<int, Categoria>
     */
    public function __invoke(): Collection
    {
        return $this->categorias->obtenerActivas();
    }
}
