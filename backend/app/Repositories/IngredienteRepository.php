<?php

namespace App\Repositories;

use App\Models\Ingrediente;
use Illuminate\Support\Collection;

/**
 * Puerto de persistencia de INGREDIENTES (capa Repository).
 */
interface IngredienteRepository
{
    /**
     * @return Collection<int, Ingrediente>
     */
    public function todos(): Collection;

    /**
     * Lanza ModelNotFoundException (404) si no existe.
     */
    public function porIdOrFail(int $id): Ingrediente;

    /**
     * @param  array<string, mixed>  $datos
     */
    public function crear(array $datos): Ingrediente;

    /**
     * @param  array<string, mixed>  $datos
     */
    public function actualizar(Ingrediente $ingrediente, array $datos): Ingrediente;

    public function eliminar(Ingrediente $ingrediente): void;

    /**
     * Saca al ingrediente de todos los platos (pivot plato_ingrediente)
     * antes de darlo de baja.
     */
    public function desprenderDePlatos(Ingrediente $ingrediente): void;
}
