<?php

namespace App\Repositories;

use App\Models\Categoria;
use Illuminate\Support\Collection;

class EloquentCategoriaRepository implements CategoriaRepository
{
    public function activas(): Collection
    {
        return Categoria::where('activo', true)->get();
    }

    public function todas(): Collection
    {
        return Categoria::all();
    }

    public function porIdOrFail(int $id): Categoria
    {
        return Categoria::findOrFail($id);
    }

    public function crear(array $datos): Categoria
    {
        return Categoria::create($datos);
    }

    public function actualizar(Categoria $categoria, array $datos): Categoria
    {
        $categoria->update($datos);

        return $categoria;
    }

    public function eliminar(Categoria $categoria): void
    {
        $categoria->delete();
    }
}
