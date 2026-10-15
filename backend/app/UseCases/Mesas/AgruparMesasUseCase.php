<?php

namespace App\UseCases\Mesas;

use App\Models\Mesa;
use App\Services\MesaService;
use Illuminate\Support\Collection;

/**
 * CASO DE USO: agrupar mesas para el resumen conjunto de lectura
 * (POST /api/mesas/agrupar). Los códigos NO cambian.
 *
 * @param  list<int>  $mesasIds
 * @return array{grupo_codigo: int, mesas: Collection<int, Mesa>, codigos: array<int, string>}
 *
 * @throws \Exception (controller responde 422)
 */
class AgruparMesasUseCase
{
    public function __construct(private MesaService $mesas) {}

    /**
     * @param  list<int>  $mesasIds
     * @return array{grupo_codigo: int, mesas: Collection<int, Mesa>, codigos: array<int, string>}
     */
    public function __invoke(array $mesasIds): array
    {
        return $this->mesas->agrupar($mesasIds);
    }
}
