<?php

namespace App\Repositories;

use App\Models\Plato;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

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

    public function todos(): Collection
    {
        return Plato::join('categorias', 'platos.categoria_id', '=', 'categorias.id')
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

    public function platosParaAjuste(?int $categoriaId): Collection
    {
        $query = Plato::query()->select('id', 'categoria_id', 'nombre', 'precio');

        if ($categoriaId !== null) {
            $query->where('categoria_id', $categoriaId);
        }

        return $query->get();
    }

    public function actualizarPreciosEnLote(array $precios): void
    {
        if ($precios === []) {
            return;
        }

        // Agrupa por precio destino: con redondeo a 50/100 la mayoría
        // de los platos termina con el mismo precio → una UPDATE por
        // precio distinto en vez de una por plato. La clave es string:
        // un float como key de array se truncaría a int y perdería los
        // decimales del redondeo null.
        $porPrecio = [];

        foreach ($precios as $id => $precio) {
            $porPrecio[(string) $precio][] = (int) $id;
        }

        DB::transaction(function () use ($porPrecio) {
            foreach ($porPrecio as $precio => $ids) {
                Plato::whereIn('id', $ids)->update(['precio' => (float) $precio]);
            }
        });
    }
}
