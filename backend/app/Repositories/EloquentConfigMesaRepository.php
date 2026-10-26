<?php

namespace App\Repositories;

use App\Models\ConfigMesa;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class EloquentConfigMesaRepository implements ConfigMesaRepository
{
    public function filas(): Collection
    {
        return ConfigMesa::orderBy('capacidad')->orderBy('id')->get();
    }

    public function aforo(): int
    {
        $filas = $this->filas();

        if ($filas->isEmpty()) {
            return 100;
        }

        return (int) $filas->sum(fn (ConfigMesa $fila) => $fila->capacidad * $fila->cantidad);
    }

    public function cantidadMaximaMesas(): int
    {
        $filas = $this->filas();

        if ($filas->isEmpty()) {
            return 25;
        }

        return (int) $filas->sum('cantidad');
    }

    public function reemplazar(array $filas): void
    {
        DB::transaction(function () use ($filas) {
            ConfigMesa::query()->delete();

            foreach ($filas as $fila) {
                ConfigMesa::create([
                    'cantidad' => (int) $fila['cantidad'],
                    'capacidad' => (int) $fila['capacidad'],
                ]);
            }
        });
    }
}
