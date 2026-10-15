<?php

namespace App\UseCases\Mesas;

use App\Models\Mesa;
use App\Services\MesaService;

/**
 * CASO DE USO: sacar las mesas del grupo (POST /api/mesas/desagrupar).
 *
 * @param  list<int>  $mesasIds
 * @return list<Mesa>
 *
 * @throws \Exception (controller responde 422)
 */
class DesagruparMesasUseCase
{
    public function __construct(private MesaService $mesas) {}

    /**
     * @param  list<int>  $mesasIds
     * @return list<Mesa>
     */
    public function __invoke(array $mesasIds): array
    {
        return $this->mesas->desagrupar($mesasIds);
    }
}
