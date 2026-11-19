<?php

namespace App\Repositories;

use App\Models\Mesa;
use Illuminate\Support\Collection;

class EloquentMesaRepository implements MesaRepository
{
    public function todas(): Collection
    {
        return Mesa::all();
    }

    public function disponibles(): Collection
    {
        return Mesa::where('estado', 'libre')->get();
    }

    public function porId(int $id): ?Mesa
    {
        return Mesa::find($id);
    }

    public function porIdOrFail(int $id): Mesa
    {
        return Mesa::findOrFail($id);
    }

    public function conTrashedOrFail(int $id): Mesa
    {
        return Mesa::withTrashed()->findOrFail($id);
    }

    public function porCodigo(string $codigo): ?Mesa
    {
        return Mesa::where('codigo_acceso', $codigo)->first();
    }

    public function crear(array $datos): Mesa
    {
        return Mesa::create($datos);
    }

    public function capacidadOcupada(): int
    {
        return (int) Mesa::sum('capacidad');
    }

    /**
     * Candidato de 6 dígitos (1.000.000 de combinaciones). La unicidad
     * la garantiza el UNIQUE de la BD: `MesaService::crearMesa` inserta
     * y regenera ante una colisión, así dos altas simultáneas no
     * compiten por el mismo chequeo previo.
     */
    public function nuevoCodigoAcceso(): string
    {
        return str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    }

    public function porGrupo(int $grupoCodigo, array $excluirIds = []): Collection
    {
        return Mesa::where('grupo_codigo', $grupoCodigo)
            ->whereNotIn('id', $excluirIds)
            ->get();
    }

    public function porIds(array $ids): Collection
    {
        return Mesa::whereIn('id', $ids)->get();
    }

    public function eliminar(Mesa $mesa): void
    {
        $mesa->delete();
    }

    public function cantidadPorEstado(): array
    {
        return Mesa::query()
            ->selectRaw('estado, count(*) as cantidad')
            ->groupBy('estado')
            ->pluck('cantidad', 'estado')
            ->map(fn ($cantidad) => (int) $cantidad)
            ->all();
    }
}
