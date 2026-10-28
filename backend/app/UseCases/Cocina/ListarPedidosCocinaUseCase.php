<?php

namespace App\UseCases\Cocina;

use App\Models\Pedido;
use App\Repositories\PedidoRepository;
use Illuminate\Support\Collection;

/**
 * CASO DE USO: cola de cocina (GET /api/cocina/pedidos, permiso
 * preparar_pedidos). Devuelve los pedidos "enviado" (por preparar) y
 * "en_preparacion" (en cocción) de TODAS las mesas, con sus líneas
 * (plato, ingredientes, promo aplicada) y su mesa, en orden de
 * llegada. Los que quedaron "listo" ya no aparecen: los retira el
 * mozo.
 */
class ListarPedidosCocinaUseCase
{
    public function __construct(private PedidoRepository $pedidos) {}

    /**
     * @return Collection<int, Pedido>
     */
    public function __invoke(): Collection
    {
        return $this->pedidos->pendientesDeCocina();
    }
}
