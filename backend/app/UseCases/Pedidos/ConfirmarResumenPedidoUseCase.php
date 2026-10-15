<?php

namespace App\UseCases\Pedidos;

use App\Models\Pedido;
use App\Services\PedidoService;

/**
 * CASO DE USO: 1er paso del envío (POST /api/pedidos/{id}/confirmar):
 * gate de que ninguna línea siga `confirmado = false` (o `forzar`).
 * Deja el pedido en estado "confirmado".
 *
 * @throws \Exception gate en rojo (controller responde 422)
 */
class ConfirmarResumenPedidoUseCase
{
    public function __construct(private PedidoService $pedidos) {}

    public function __invoke(int $pedidoId, bool $forzar = false): Pedido
    {
        return $this->pedidos->confirmarResumen($pedidoId, $forzar);
    }
}
