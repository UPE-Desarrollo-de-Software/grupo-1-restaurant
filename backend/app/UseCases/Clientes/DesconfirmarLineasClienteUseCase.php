<?php

namespace App\UseCases\Clientes;

use App\Models\Pedido;
use App\Services\PedidoService;

/**
 * CASO DE USO: el comensal deshace la confirmación de sus líneas
 * (POST /cliente/pedidos/desconfirmar; sólo mientras el pedido está
 * en curso).
 *
 * @param  list<int>|null  $detalleIds
 *
 * @throws \Exception (controller responde 422)
 */
class DesconfirmarLineasClienteUseCase
{
    public function __construct(private PedidoService $pedidos) {}

    /**
     * @param  list<int>|null  $detalleIds
     */
    public function __invoke(int $mesaId, int $pedidoId, ?array $detalleIds = null): Pedido
    {
        return $this->pedidos->confirmarLineas($pedidoId, $detalleIds, false, $mesaId);
    }
}
