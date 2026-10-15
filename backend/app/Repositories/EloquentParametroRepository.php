<?php

namespace App\Repositories;

use App\Models\Parametro;

class EloquentParametroRepository implements ParametroRepository
{
    public function valor(string $clave): ?string
    {
        $valor = Parametro::where('clave', $clave)->value('valor');

        return $valor === null ? null : (string) $valor;
    }

    public function capacidadTotal(): int
    {
        return (int) ($this->valor('capacidad_total') ?? 100);
    }

    public function establecer(string $clave, string $valor): void
    {
        Parametro::updateOrCreate(['clave' => $clave], ['valor' => $valor]);
    }
}
