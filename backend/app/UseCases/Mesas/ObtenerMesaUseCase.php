<?php

namespace App\UseCases\Mesas;

use App\Models\Mesa;
use App\Services\MesaService;
use Illuminate\Database\Eloquent\ModelNotFoundException;

/**
 * CASO DE USO: obtener una mesa por id (GET /api/mesas/{id}).
 * null = no existe o fue destruida (contrato 200 + message del API).
 */
class ObtenerMesaUseCase
{
    public function __construct(private MesaService $mesas) {}

    public function __invoke(int $id): ?Mesa
    {
        try {
            return $this->mesas->obtenerPorId($id);
        } catch (ModelNotFoundException) {
            return null;
        }
    }
}
