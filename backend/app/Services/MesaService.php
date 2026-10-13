<?php

namespace App\Services;

use App\Models\Mesa;

class MesaService
{
    public function obtenerDisponibles()
    {
        // Estado 'libre' = sin pedido activo ni reserva (DER v2.1).
        return Mesa::where('estado', 'libre')->get();
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
