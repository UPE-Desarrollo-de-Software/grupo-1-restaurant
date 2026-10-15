<?php

namespace App\Repositories;

use App\Models\Ingrediente;
use Illuminate\Support\Collection;

class EloquentIngredienteRepository implements IngredienteRepository
{
    public function todos(): Collection
    {
        return Ingrediente::all();
    }

    public function porIdOrFail(int $id): Ingrediente
    {
        return Ingrediente::findOrFail($id);
    }

    public function crear(array $datos): Ingrediente
    {
        return Ingrediente::create($datos);
    }

    public function actualizar(Ingrediente $ingrediente, array $datos): Ingrediente
    {
        $ingrediente->update($datos);

        return $ingrediente;
    }

    public function eliminar(Ingrediente $ingrediente): void
    {
        $ingrediente->delete();
    }

    public function desprenderDePlatos(Ingrediente $ingrediente): void
    {
        $ingrediente->platos()->detach();
    }
}
