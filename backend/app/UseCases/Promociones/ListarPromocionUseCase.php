<?php

namespace App\UseCases\Promociones;

use App\Models\Promocion;
use App\Services\PromocionService;
use Illuminate\Support\Collection;

/**
 * CASO DE USO: listar las promociones del catálogo
 * (GET /api/promociones).
 */
class ListarPromocionUseCase
{
    public function __construct(private PromocionService $promociones) {}

    /**
     * @return Collection<int, Promocion>
     */
    public function __invoke(): Collection
    {
        return $this->promociones->listar();
    }
}
