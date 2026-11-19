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

    public function codigoExiste(string $codigo): bool
    {
        // withTrashed: un código de una mesa destruida no debe volver a
        // emitirse (el unique de la BD lo impediría igual).
        return Mesa::withTrashed()
            ->where('codigo_acceso', $codigo)
            ->exists();
    }

    /**
     * Código de 4 dígitos libre. Corta a los 50 intentos: si el pool
     * está agotado (10.000 visitas acumuladas, `codigoExiste` también
     * mira las mesas cerradas) lanza en vez de colgarse para siempre.
     * `MesaController::store` catchea \Exception → 422 con el mensaje.
     */
    public function nuevoCodigoAcceso(): string
    {
        for ($intento = 0; $intento < 50; $intento++) {
            $codigo = str_pad((string) random_int(0, 9999), 4, '0', STR_PAD_LEFT);

            if (! $this->codigoExiste($codigo)) {
                return $codigo;
            }
        }

        throw new \RuntimeException(
            'No hay códigos de mesa disponibles: el salón llegó al límite de 10.000 visitas. Cerrá el local y avisá al administrador.'
        );
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
