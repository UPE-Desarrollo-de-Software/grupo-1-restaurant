<?php

namespace App\UseCases\Promociones;

use App\Models\Promocion;
use App\Services\PromocionService;
use Illuminate\Database\Eloquent\ModelNotFoundException;

/**
 * CASO DE USO: obtener una promoción por id
 * (GET /api/promociones/{id}). null = no existe (contrato 200 +
 * message).
 */
class ObtenerPromocionUseCase
{
    public function __construct(private PromocionService $promociones) {}

    public function __invoke(int $id): ?Promocion
    {
        try {
            return $this->promociones->obtenerPorId($id);
        } catch (ModelNotFoundException) {
            return null;
        }
    }
}
