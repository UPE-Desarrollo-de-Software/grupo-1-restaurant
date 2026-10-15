<?php

namespace App\UseCases\Platos;

use App\Models\Plato;
use App\Services\PlatoService;
use Illuminate\Database\Eloquent\ModelNotFoundException;

/**
 * CASO DE USO: actualizar un plato (PUT /api/platos/{id}).
 * null = no existe (contrato 200 + message).
 */
class ActualizarPlatoUseCase
{
    public function __construct(private PlatoService $platos) {}

    /**
     * @param  array<string, mixed>  $datos
     */
    public function __invoke(int $id, array $datos): ?Plato
    {
        try {
            return $this->platos->actualizar($id, $datos);
        } catch (ModelNotFoundException) {
            return null;
        }
    }
}
