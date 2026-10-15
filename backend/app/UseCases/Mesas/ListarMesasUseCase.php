<?php

namespace App\UseCases\Mesas;

use App\Models\Mesa;
use App\Services\MesaService;
use Illuminate\Support\Collection;

/**
 * CASO DE USO: listar todas las mesas vivas (GET /api/mesas; las
 * destruidas quedan afuera gracias al SoftDeletes).
 */
class ListarMesasUseCase
{
    public function __construct(private MesaService $mesas) {}

    /**
     * @return Collection<int, Mesa>
     */
    public function __invoke(): Collection
    {
        return $this->mesas->obtenerMesas();
    }
}
