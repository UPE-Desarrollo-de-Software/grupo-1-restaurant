<?php

namespace App\Repositories;

use App\Models\DetallePreOrden;
use App\Models\Reserva;
use Illuminate\Support\Collection;

class EloquentPreordenRepository implements PreordenRepository
{
    public function guardar(Reserva $reserva, array $lineas): Collection
    {
        foreach ($lineas as $linea) {
            DetallePreOrden::updateOrCreate(
                [
                    'reserva_id' => $reserva->id,
                    'plato_id' => (int) $linea['plato_id'],
                ],
                ['cantidad' => (int) $linea['cantidad']],
            );
        }

        return $this->deReserva($reserva->id);
    }

    public function deReserva(int $reservaId): Collection
    {
        return DetallePreOrden::where('reserva_id', $reservaId)
            ->orderBy('id')
            ->get();
    }

    public function pendientesDeReserva(int $reservaId): Collection
    {
        return DetallePreOrden::where('reserva_id', $reservaId)
            ->whereNull('pedido_id')
            ->orderBy('id')
            ->get();
    }

    public function marcarConvertida(int $reservaId, int $pedidoId): void
    {
        DetallePreOrden::where('reserva_id', $reservaId)
            ->whereNull('pedido_id')
            ->update(['pedido_id' => $pedidoId]);
    }

    public function borrarDeReserva(int $reservaId): void
    {
        DetallePreOrden::where('reserva_id', $reservaId)->delete();
    }

    public function find(int $id): ?DetallePreOrden
    {
        return DetallePreOrden::find($id);
    }

    public function all(): Collection
    {
        return DetallePreOrden::all();
    }
}
