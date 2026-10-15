<?php

namespace App\Repositories;

use App\Models\Categoria;
use Illuminate\Support\Collection;

/**
 * Puerto de persistencia de CATEGORÍAS (capa Repository).
 */
interface CategoriaRepository
{
    /**
     * Categorías activas (las que muestra la carta).
     *
     * @return Collection<int, Categoria>
     */
    public function activas(): Collection;

    /**
     * Todas las categorías (incluidas inactivas).
     *
     * @return Collection<int, Categoria>
     */
    public function todas(): Collection;

    /**
     * Categoría por id; lanza ModelNotFoundException (404) si no existe.
     */
    public function porIdOrFail(int $id): Categoria;

    /**
     * @param  array<string, mixed>  $datos
     */
    public function crear(array $datos): Categoria;

    /**
     * @param  array<string, mixed>  $datos
     */
    public function actualizar(Categoria $categoria, array $datos): Categoria;

    public function eliminar(Categoria $categoria): void;
}
