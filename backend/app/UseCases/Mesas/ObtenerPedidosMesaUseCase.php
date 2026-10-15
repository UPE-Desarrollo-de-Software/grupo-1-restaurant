<?php

namespace App\UseCases\Mesas;

use App\Services\MesaService;

/**
 * CASO DE USO: pedidos activos de la mesa
 * (GET /api/mesas/{id}/pedido-activo, permiso tomar_pedidos).
 * Responde { pedidos: [...] } (vacío si no hay): con varios comensales
 * ya no existe "el" pedido de la mesa.
 *
 * @return array{pedidos: list<array<string, mixed>>}
 */
class ObtenerPedidosMesaUseCase
{
    public function __construct(private MesaService $mesas) {}

    /**
     * @return array{pedidos: list<array<string, mixed>>}
     */
    public function __invoke(int $mesaId): array
    {
        return ['pedidos' => $this->mesas->resumen($mesaId)['pedidos']];
    }
}
