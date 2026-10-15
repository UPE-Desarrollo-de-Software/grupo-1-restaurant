<?php

namespace App\UseCases\Mesas;

use App\Models\Mesa;
use App\Services\MesaService;

/**
 * CASO DE USO: ocupar la mesa (POST /api/mesas/{id}/ocupar). NO
 * regenera el codigo_acceso: el código es estable hasta que la mesa se
 * destruya.
 *
 * @return array{mesa: Mesa, codigo_acceso: string}
 *
 * @throws \Exception mesa inexistente (controller responde 422)
 */
class OcuparMesaUseCase
{
    public function __construct(private MesaService $mesas) {}

    /**
     * @return array{mesa: Mesa, codigo_acceso: string}
     */
    public function __invoke(int $mesaId): array
    {
        return $this->mesas->ocupar($mesaId);
    }
}
