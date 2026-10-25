<?php

namespace App\Repositories;

use App\Models\Reserva;
use Illuminate\Support\Collection;

class EloquentReservaRepository implements ReservaRepository
{
    public function porIdOrFail(int $id): Reserva
    {
        return Reserva::with(['mesa', 'inventario'])->findOrFail($id);
    }

    public function crear(array $datos): Reserva
    {
        return Reserva::create($datos);
    }

    public function filtradas(?string $estado, ?string $fecha, ?int $mesaId): Collection
    {
        return Reserva::with(['mesa', 'inventario'])
            ->when($estado !== null, fn ($q) => $q->where('estado', $estado))
            ->when($fecha !== null, fn ($q) => $q->where('fecha', $fecha))
            ->when($mesaId !== null, fn ($q) => $q->where('mesa_id', $mesaId))
            ->orderBy('fecha')
            ->orderBy('hora')
            ->get();
    }

    public function pendientesDeFecha(string $fecha): Collection
    {
        // Lock: bloquea las filas del día mientras corre el alta. Ver
        // docblock del interface (MySQL serializa; SQLite no-op).
        return Reserva::with('inventario')
            ->where('fecha', $fecha)
            ->where('estado', 'pendiente')
            ->lockForUpdate()
            ->get();
    }

    public function pendientesHastaFecha(string $fecha): Collection
    {
        return Reserva::where('fecha', '<=', $fecha)
            ->where('estado', 'pendiente')
            ->get();
    }

    public function pendientesDeMesa(int $mesaId): Collection
    {
        return Reserva::where('mesa_id', $mesaId)
            ->where('estado', 'pendiente')
            ->get();
    }

    public function resumenDelDia(string $fecha): array
    {
        $porEstado = Reserva::where('fecha', $fecha)
            ->selectRaw('estado, count(*) as cantidad')
            ->groupBy('estado')
            ->pluck('cantidad', 'estado')
            ->map(fn ($cantidad) => (int) $cantidad)
            ->all();

        $personasPendientes = (int) Reserva::where('fecha', $fecha)
            ->where('estado', 'pendiente')
            ->sum('cantPersonas');

        return [
            'por_estado' => $porEstado,
            'total_personas_pendientes' => $personasPendientes,
        ];
    }
}
