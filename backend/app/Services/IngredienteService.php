<?php

namespace App\Services;

use App\Models\Ingrediente;


class IngredienteService
{

    public function obtenerTodos()
    {
        return Ingrediente::all();
    }

    public function obtenerPorId($id)
    {
        return Ingrediente::findOrFail($id);
    }

    public function crear(array $datos)
    {
        return Ingrediente::create($datos);
    }

    public function actualizar($id, array $datos)
    {
        $ingrediente = Ingrediente::findOrFail($id);
        $ingrediente->update($datos);
        return $ingrediente;
    }

    public function eliminar($id)
    {
        $ingrediente = Ingrediente::findOrFail($id);
        $ingrediente->productos()->detach(); // Eliminar relaciones con productos
        $ingrediente->delete();
    }
}
