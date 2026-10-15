<?php

namespace App\UseCases\Mesas;

use App\Services\MesaService;

/**
 * CASO DE USO: cuenta dividida de la mesa en PARTES por pedido raíz
 * (GET /api/mesas/{id}/cuenta y GET /cliente/cuenta; el comensal
 * identifica SU parte con el pedido_id que guardó en su dispositivo).
 *
 * @return array<string, mixed>
 */
class ObtenerCuentaMesaUseCase
{
    public function __construct(private MesaService $mesas) {}

    /**
     * @return array<string, mixed>
     */
    public function __invoke(int $mesaId): array
    {
        return $this->mesas->cuenta($mesaId);
    }
}
