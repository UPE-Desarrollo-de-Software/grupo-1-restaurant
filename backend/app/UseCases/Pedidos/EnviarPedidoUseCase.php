<?php

namespace App\UseCases\Pedidos;

use App\Models\Pedido;
use App\Services\PedidoService;

/**
 * CASO DE USO: 2do paso del envío (POST /api/pedidos/{id}/enviar):
 * "confirmado" → "enviado" (hacia cocina).
 *
 * @throws \Exception (controller responde 422)
 */
class EnviarPedidoUseCase
{
    public function __construct(private PedidoService $pedidos) {}

    public function __invoke(int $pedidoId): Pedido
    {
        return $this->pedidos->enviarPedido($pedidoId);
    }
}
