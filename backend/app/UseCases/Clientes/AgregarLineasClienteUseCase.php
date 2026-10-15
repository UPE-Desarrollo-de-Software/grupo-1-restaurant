<?php

namespace App\UseCases\Clientes;

use App\Models\Pedido;
use App\Services\PedidoService;

/**
 * CASO DE USO: el comensal agrega SUS líneas (POST /cliente/pedidos).
 *
 * Identidad = el front envía el pedido que guardó en su dispositivo:
 *  - `pedidoId` → agrega a su pedido en curso;
 *  - `pedidoPadreId` → crea un HIJO de su primer pedido (raíz), sólo
 *    si esa raíz ya no está en curso (si lo está, tiene que agrandarla);
 *  - ninguno → crea su pedido RAÍZ.
 *
 * Las líneas nacen `confirmado = false` (gate del mozo).
 *
 * @param  array<int, array<string, mixed>>  $lineas
 *
 * @throws \Exception (controller responde 422)
 */
class AgregarLineasClienteUseCase
{
    public function __construct(private PedidoService $pedidos) {}

    /**
     * @param  array<int, array<string, mixed>>  $lineas
     */
    public function __invoke(
        int $mesaId,
        array $lineas,
        ?int $pedidoId = null,
        ?int $pedidoPadreId = null,
    ): Pedido {
        return $this->pedidos->agregarProducto(
            $mesaId,
            $lineas,
            $pedidoId,
            $pedidoPadreId,
            true,
        );
    }
}
