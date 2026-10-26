<?php

namespace App\Repositories;

use App\Models\Plato;
use Illuminate\Support\Collection;

/**
 * Puerto de persistencia de PLATOS (capa Repository).
 *
 * Las relaciones con categorías (join de la carta) y con ingredientes
 * (sync/detach del pivot plato_ingrediente) también son persistencia:
 * viven acá, no en PlatoService.
 */
interface PlatoRepository
{
    /**
     * Platos disponibles con el nombre de su categoría (vista de carta).
     *
     * @return Collection<int, Plato>
     */
    public function disponiblesConCategoria(): Collection;

    /**
     * Plato con sus ingredientes (flags opcional/por_defecto en el
     * pivot); lanza ModelNotFoundException (404) si no existe.
     */
    public function conIngredientesOrFail(int $id): Plato;

    /**
     * @param  array<string, mixed>  $datos
     */
    public function crear(array $datos): Plato;

    /**
     * @param  array<string, mixed>  $datos
     */
    public function actualizar(Plato $plato, array $datos): Plato;

    public function eliminar(Plato $plato): void;

    /**
     * Sincroniza los ingredientes del plato en el pivot
     * plato_ingrediente.
     *
     * @param  array<int, array{opcional: bool, por_defecto: bool}>  $ingredientes
     */
    public function sincronizarIngredientes(Plato $plato, array $ingredientes): void;

    public function desprenderIngredientes(Plato $plato): void;

    public function todos();
}
