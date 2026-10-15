<?php

namespace App\Services;

use App\Models\Categoria;
use App\Repositories\CategoriaRepository;
use Illuminate\Support\Collection;

/**
 * Categorías de la carta (capa de dominio sobre el Repository).
 */
class CategoriaService
{
    public function __construct(private CategoriaRepository $categorias) {}

    /**
     * @return Collection<int, Categoria>
     */
    public function obtenerActivas()
    {
        return $this->categorias->activas();
    }

    /**
     * @return Collection<int, Categoria>
     */
    public function obtenerTodos()
    {
        return $this->categorias->todas();
    }

    public function obtenerPorId(int $id): Categoria
    {
        return $this->categorias->porIdOrFail($id);
    }

    /**
     * @param  array<string, mixed>  $datos
     */
    public function crear(array $datos): Categoria
    {
        return $this->categorias->crear($datos);
    }

    /**
     * @param  array<string, mixed>  $datos
     */
    public function actualizar(int $id, array $datos): Categoria
    {
        $categoria = $this->categorias->porIdOrFail($id);

        return $this->categorias->actualizar($categoria, $datos);
    }

    public function eliminar(int $id): void
    {
        $this->categorias->eliminar($this->categorias->porIdOrFail($id));
    }
}
