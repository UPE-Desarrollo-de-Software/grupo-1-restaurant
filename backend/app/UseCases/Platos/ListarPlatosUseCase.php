<?php

namespace App\UseCases\Platos;

use App\Models\Plato;
use App\Services\PlatoService;
use Illuminate\Support\Collection;

/**
 * CASO DE USO: listar los platos disponibles de la carta
 * (GET /api/platos).
 */
class ListarPlatosUseCase
{
    public function __construct(private PlatoService $platos) {}

    /**
     * @return Collection<int, Plato>
     */
    public function __invoke(): Collection
    {
        return $this->platos->todos();
    }
}
