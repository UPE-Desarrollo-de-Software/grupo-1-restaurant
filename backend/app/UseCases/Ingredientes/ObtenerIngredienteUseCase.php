<?php

namespace App\UseCases\Ingredientes;

use App\Models\Ingrediente;
use App\Services\IngredienteService;

/**
 * CASO DE USO: obtener un ingrediente por id (GET /api/ingredientes/{id}).
 * A diferencia del resto de los recursos, acá SÍ se responde 404
 * (ModelNotFoundException): es la convención que ya usaba la API.
 */
class ObtenerIngredienteUseCase
{
    public function __construct(private IngredienteService $ingredientes) {}

    public function __invoke(int $id): Ingrediente
    {
        return $this->ingredientes->obtenerPorId($id);
    }
}
