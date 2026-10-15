<?php

namespace App\UseCases\Pedidos;

use App\Models\Pedido;
use App\Services\PedidoService;

/**
 * CASO DE USO: avanzar el flujo de estados o cancelar
 * (PUT /api/pedidos/{id}/estado). Al llegar a un estado final, si la
 * mesa quedó sin pedidos activos se DESTRUYE (borrado lógico).
 *
 * @throws \Exception transición inválida (controller responde 422)
 */
class CambiarEstadoPedidoUseCase
{
    public function __construct(private PedidoService $pedidos) {}

    public function __invoke(int $pedidoId, string $nuevoEstado): Pedido
    {
        return $this->pedidos->cambiarEstado($pedidoId, $nuevoEstado);
    }
}
