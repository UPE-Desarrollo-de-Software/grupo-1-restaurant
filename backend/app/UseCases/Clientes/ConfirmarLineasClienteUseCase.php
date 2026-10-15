<?php

namespace App\UseCases\Clientes;

use App\Models\Pedido;
use App\Services\PedidoService;

/**
 * CASO DE USO: el comensal confirma sus líneas
 * (POST /cliente/pedidos/confirmar). `pedidoId` (obligatorio) es SU
 * pedido en la mesa; `detalleIds` opcional para marcar solo algunas
 * (null = todas las de ese pedido). El pedido debe ser de la mesa del
 * código con el que entró.
 *
 * @param  list<int>|null  $detalleIds
 *
 * @throws \Exception (controller responde 422)
 */
class ConfirmarLineasClienteUseCase
{
    public function __construct(private PedidoService $pedidos) {}

    /**
     * @param  list<int>|null  $detalleIds
     */
    public function __invoke(int $mesaId, int $pedidoId, ?array $detalleIds = null): Pedido
    {
        return $this->pedidos->confirmarLineas($pedidoId, $detalleIds, true, $mesaId);
    }
}
