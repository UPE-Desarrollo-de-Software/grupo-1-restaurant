<?php

namespace App\Repositories;

use App\Models\Reserva;
use Illuminate\Support\Collection;

class EloquentReservaRepository implements ReservaRepository
{
    public function porIdOrFail(int $id): Reserva
    {
        return Reserva::with('mesa')->findOrFail($id);
    }

    public function crear(array $datos): Reserva
    {
        return Reserva::create($datos);
    }

    public function existeConflicto(int $mesaId, string $fecha, string $hora): bool
    {
        return Reserva::where('mesa_id', $mesaId)
            ->where('fecha', $fecha)
            ->where('hora', $hora)
            ->where('estado', 'pendiente')
            ->exists();
    }

    public function filtradas(?string $estado, ?string $fecha, ?int $mesaId): Collection
    {
        return Reserva::with('mesa')
            ->when($estado !== null, fn ($q) => $q->where('estado', $estado))
            ->when($fecha !== null, fn ($q) => $q->where('fecha', $fecha))
            ->when($mesaId !== null, fn ($q) => $q->where('mesa_id', $mesaId))
            ->orderBy('fecha')
            ->orderBy('hora')
            ->get();
    }

    public function hayPendienteEnFecha(int $mesaId, string $fecha): bool
    {
        return Reserva::where('mesa_id', $mesaId)
            ->where('fecha', $fecha)
            ->where('estado', 'pendiente')
            ->exists();
    }

    public function pendientesDeMesa(int $mesaId): Collection
    {
        return Reserva::where('mesa_id', $mesaId)
            ->where('estado', 'pendiente')
            ->get();
    }
}
