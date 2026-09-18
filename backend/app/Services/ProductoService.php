<?php

namespace App\Services;

use App\Models\Producto;

class ProductoService
{

    public function obtenerDisponibles()
    {
        return Producto::join('categorias', 'productos.categoria_id', '=', 'categorias.id')
            ->where('productos.disponible', true)
            ->select(
                'categorias.nombre as categoria_nombre',
                'productos.id',
                'productos.categoria_id',
                'productos.nombre',
                'productos.descripcion',
                'productos.precio',
                'productos.imagen',
                'productos.disponible'

            )
            ->get();
    }

    public function obtenerConIngredientes($id)
    {
        return Producto::with('ingredientes:id,nombre')
            ->findOrFail($id);
    }

    public function crear(array $datos)
    {
        $ingredientes = $datos['ingredientes'] ?? [];

        unset($datos['ingredientes']);

        $producto = Producto::create($datos);

        $producto->ingredientes()->attach($ingredientes);

        return $producto->load('ingredientes:id,nombre');
    }

    public function actualizar($id, array $datos)
    {
        $producto = Producto::findOrFail($id);

        $ingredientes = $datos['ingredientes'] ?? [];

        unset($datos['ingredientes']);

        $producto->update($datos);

        $producto->ingredientes()->sync($ingredientes);

        return $producto->load('ingredientes:id,nombre');
    }

    public function eliminar($id)
    {
        $producto = Producto::findOrFail($id);
        $producto->ingredientes()->detach(); // Eliminar relaciones con ingredientes
        $producto->delete();
    }
}
