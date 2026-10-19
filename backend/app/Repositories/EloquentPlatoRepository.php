<?php

namespace App\Repositories;

use App\Models\Plato;
use Illuminate\Support\Collection;

class EloquentPlatoRepository implements PlatoRepository
{
    public function disponiblesConCategoria(): Collection
    {
        return Plato::join('categorias', 'platos.categoria_id', '=', 'categorias.id')
            ->where('platos.disponible', true)
            ->with('promocion')
            ->select(
                'categorias.nombre as categoria_nombre',
                'platos.id',
                'platos.categoria_id',
                'platos.promocion_id',
                'platos.nombre',
                'platos.descripcion',
                'platos.precio',
                'platos.imagen',
                'platos.disponible'
            )
            ->get();
    }

    public function conIngredientesOrFail(int $id): Plato
    {
        return Plato::with('ingredientes:id,nombre,precioAdicional', 'promocion')
            ->findOrFail($id);
    }

    public function crear(array $datos): Plato
    {
        return Plato::create($datos);
    }

    public function actualizar(Plato $plato, array $datos): Plato
    {
        $plato->update($datos);

        return $plato;
    }

    public function eliminar(Plato $plato): void
    {
        $plato->delete();
    }

    public function sincronizarIngredientes(Plato $plato, array $ingredientes): void
    {
        $plato->ingredientes()->sync($ingredientes);
    }

    public function desprenderIngredientes(Plato $plato): void
    {
        $plato->ingredientes()->detach();
    }
}
