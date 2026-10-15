<?php

namespace App\UseCases\Mesas;

use App\Services\MesaService;

/**
 * CASO DE USO: resumen de lectura de la mesa con TODOS sus pedidos
 * activos (GET /api/mesas/{id}/pedidos). Comparten el mozo
 * (permiso tomar_pedidos) y el comensal (/cliente/pedidos): misma
 * respuesta para ambos.
 *
 * @return array<string, mixed>
 */
class ObtenerResumenMesaUseCase
{
    public function __construct(private MesaService $mesas) {}

    /**
     * @return array<string, mixed>
     */
    public function __invoke(int $mesaId): array
    {
        return $this->mesas->resumen($mesaId);
    }
}
