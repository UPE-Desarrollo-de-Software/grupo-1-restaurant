<?php

namespace App\Services;

use App\Models\Categoria;

class CategoriaService
{

    public function obtenerTodos()
    {
        return Categoria::all();
    }

    public function obtenerPorId($id)
    {
        return Categoria::findOrFail($id);
    }

    public function crear(array $datos)
    {
        return Categoria::create($datos);
    }

    public function actualizar($id, array $datos)
    {
        $categoria = Categoria::findOrFail($id);
        $categoria->update($datos);
        return $categoria;
    }

    public function eliminar($id)
    {
        $categoria = Categoria::findOrFail($id);
        $categoria->delete();
    }
}
