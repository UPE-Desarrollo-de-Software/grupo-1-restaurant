<?php

namespace App\UseCases\Cocina;

use App\Models\Pedido;
use App\Services\PedidoService;

/**
 * CASO DE USO: avanzar un pedido en la cocina
 * (PUT /api/cocina/pedidos/{id}/estado, permiso preparar_pedidos):
 *   enviado → en_preparacion → listo
 * Solo cambia el estado (sin otros efectos); sin saltos y sin cancel
 * (el resto de los estados los maneja el mozo).
 *
 * @throws \Exception (controller responde 422)
 */
class AvanzarPedidoCocinaUseCase
{
    public function __construct(private PedidoService $pedidos) {}

    public function __invoke(int $pedidoId, string $nuevoEstado): Pedido
    {
        return $this->pedidos->avanzarEnCocina($pedidoId, $nuevoEstado);
    }
}
