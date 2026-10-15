<?php

namespace App\UseCases\Mesas;

use App\Models\Mesa;
use App\Services\MesaService;
use Illuminate\Support\Collection;

/**
 * CASO DE USO: listar las mesas libres (GET /api/mesas/disponibles).
 */
class ListarMesasDisponiblesUseCase
{
    public function __construct(private MesaService $mesas) {}

    /**
     * @return Collection<int, Mesa>
     */
    public function __invoke(): Collection
    {
        return $this->mesas->obtenerDisponibles();
    }
}
