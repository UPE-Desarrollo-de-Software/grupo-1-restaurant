<?php

namespace App\UseCases\Promociones;

use App\Models\Promocion;
use App\Services\PromocionService;
use Illuminate\Database\Eloquent\ModelNotFoundException;

/**
 * CASO DE USO: actualizar una promoción (PUT /api/promociones/{id}).
 * null = no existe (contrato 200 + message).
 */
class ActualizarPromocionUseCase
{
    public function __construct(private PromocionService $promociones) {}

    /**
     * @param  array<string, mixed>  $datos
     */
    public function __invoke(int $id, array $datos): ?Promocion
    {
        try {
            return $this->promociones->actualizar($id, $datos);
        } catch (ModelNotFoundException) {
            return null;
        }
    }
}
