<?php

namespace App\Services;

use App\Models\Mesa;

class MesaService
{


    public function obtenerDisponibles()
    {
        return Mesa::where('estado', 'disponible')->get();
    }

    public function obtenerMesas()
    {
        return Mesa::all();
    }

    public function obtenerPorId(int $id)
    {
        return Mesa::findOrFail($id);
    }

    public function crearMesa(array $datos)
    {
        return Mesa::create($datos);
    }

    public function actualizar(int $id, array $datos)
    {
        $mesas = Mesa::findOrFail($id);

        $mesas->update($datos);

        return $mesas;
    }

    public function eliminar(int $id)
    {
        $mesas = Mesa::findOrFail($id);
        $mesas->delete();
    }
}
