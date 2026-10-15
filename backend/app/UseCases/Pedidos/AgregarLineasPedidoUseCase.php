<?php

namespace App\UseCases\Pedidos;

use App\Models\Pedido;
use App\Services\PedidoService;

/**
 * CASO DE USO: alta de líneas de un pedido del mozo
 * (POST /api/mesas/{id}/pedidos, permiso tomar_pedidos).
 *
 * Sin pedido_id → crea una RAÍZ nueva (la orden nueva de esa persona).
 * Con pedido_id → agrega a ese pedido si está en curso. Las líneas del
 * mozo nacen `confirmado = true` (pasan el gate solas).
 *
 * @param  array<int, array<string, mixed>>  $lineas
 *
 * @throws \Exception (controller responde 422)
 */
class AgregarLineasPedidoUseCase
{
    public function __construct(private PedidoService $pedidos) {}

    /**
     * @param  array<int, array<string, mixed>>  $lineas
     */
    public function __invoke(int $mesaId, array $lineas, ?int $pedidoId = null): Pedido
    {
        return $this->pedidos->agregarProducto(
            $mesaId,
            $lineas,
            $pedidoId,
            null,
            false,
        );
    }
}
