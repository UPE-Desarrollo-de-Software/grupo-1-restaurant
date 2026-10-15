<?php

namespace App\Services;

use App\Models\Ingrediente;
use App\Repositories\IngredienteRepository;
use Illuminate\Support\Collection;

/**
 * Ingredientes del catálogo (capa de dominio sobre el Repository).
 *
 * Los flags `opcional` / `por_defecto` ya no viven acá: están en el
 * pivot PLATO_INGREDIENTE (DER v2.2+).
 */
class IngredienteService
{
    public function __construct(private IngredienteRepository $ingredientes) {}

    /**
     * @return Collection<int, Ingrediente>
     */
    public function obtenerTodos()
    {
        return $this->ingredientes->todos();
    }

    public function obtenerPorId($id): Ingrediente
    {
        return $this->ingredientes->porIdOrFail((int) $id);
    }

    /**
     * @param  array<string, mixed>  $datos
     */
    public function crear(array $datos): Ingrediente
    {
        return $this->ingredientes->crear($datos);
    }

    /**
     * @param  array<string, mixed>  $datos
     */
    public function actualizar($id, array $datos): Ingrediente
    {
        $ingrediente = $this->ingredientes->porIdOrFail((int) $id);

        return $this->ingredientes->actualizar($ingrediente, $datos);
    }

    public function eliminar($id): void
    {
        $ingrediente = $this->ingredientes->porIdOrFail((int) $id);

        // Primero lo saca de todos los platos (pivot plato_ingrediente),
        // y recién ahí lo da de baja.
        $this->ingredientes->desprenderDePlatos($ingrediente);
        $this->ingredientes->eliminar($ingrediente);
    }
}
