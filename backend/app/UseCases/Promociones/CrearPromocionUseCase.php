<?php

namespace App\UseCases\Promociones;

use App\Models\Promocion;
use App\Services\PromocionService;

/**
 * CASO DE USO: crear una promoción del catálogo
 * (POST /api/promociones).
 */
class CrearPromocionUseCase
{
    public function __construct(private PromocionService $promociones) {}

    /**
     * @param  array<string, mixed>  $datos
     */
    public function __invoke(array $datos): Promocion
    {
        return $this->promociones->crear($datos);
    }
}
