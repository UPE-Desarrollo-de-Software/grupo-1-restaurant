<?php

namespace App\Repositories;

use App\Models\Reserva;
use Illuminate\Support\Collection;

class EloquentReservaRepository implements ReservaRepository
{
    public function porIdOrFail(int $id): Reserva
    {
        return Reserva::with(['mesa', 'inventario', 'preordenes'])->findOrFail($id);
    }

    public function porCodigo(string $codigo): ?Reserva
    {
        // Los PINs se reciclan al finalizar/cancelar: puede haber más
        // de una reserva con el mismo código. Siempre manda la
        // PENDIENTE (la que el cliente está editando); si no hay,
        // se devuelve la última de todas.
        return Reserva::with(['mesa', 'inventario', 'preordenes'])
            ->where('codigo', $codigo)
            ->orderByRaw("CASE WHEN estado = 'pendiente' THEN 0 ELSE 1 END")
            ->orderByDesc('id')
            ->first();
    }

    public function crear(array $datos): Reserva
    {
        return Reserva::create($datos);
    }

    public function filtradas(?string $estado, ?string $fecha, ?int $mesaId, ?string $codigo): Collection
    {
        return Reserva::with(['mesa', 'inventario', 'preordenes'])
            ->when($estado !== null, fn ($q) => $q->where('estado', $estado))
            ->when($fecha !== null, fn ($q) => $q->where('fecha', $fecha))
            ->when($mesaId !== null, fn ($q) => $q->where('mesa_id', $mesaId))
            ->when($codigo !== null, fn ($q) => $q->where('codigo', $codigo))
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

    public function codigoExiste(string $codigo): bool
    {
        // Solo las PENDIENTES ocupan su código: las finalizadas /
        // canceladas / no_asistio lo liberan (la reserva no usa
        // SoftDeletes, no hay con qué filtrar "muertas"). Sin unique
        // en la BD: MySQL no admite índices parciales.
        return Reserva::where('estado', 'pendiente')
            ->where('codigo', $codigo)
            ->exists();
    }

    public function nuevoCodigoAcceso(): string
    {
        do {
            $codigo = str_pad((string) random_int(0, 9999), 4, '0', STR_PAD_LEFT);
        } while ($this->codigoExiste($codigo));

        return $codigo;
    }
}
