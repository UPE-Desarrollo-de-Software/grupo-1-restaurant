<?php

namespace App\UseCases\Promociones;

use App\Services\PromocionService;
use Illuminate\Database\Eloquent\ModelNotFoundException;

/**
 * CASO DE USO: eliminar una promoción (DELETE /api/promociones/{id}).
 * null = no existe (contrato 200 + message).
 */
class EliminarPromocionUseCase
{
    public function __construct(private PromocionService $promociones) {}

    public function __invoke(int $id): bool
    {
        try {
            $this->promociones->eliminar($id);

            return true;
        } catch (ModelNotFoundException) {
            return false;
        }
    }
}
