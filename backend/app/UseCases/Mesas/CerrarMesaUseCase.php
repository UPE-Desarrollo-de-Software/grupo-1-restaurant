<?php

namespace App\UseCases\Mesas;

use App\Services\MesaService;

/**
 * CASO DE USO: cerrar la visita de una mesa (POST /api/mesas/{mesa}/
 * cerrar, permiso tomar_pedidos). El mozo lo llama cuando el CLIENTE
 * PAGÓ la cuenta: eso, y no la finalización del ciclo de vida de un
 * pedido, marca el fin de la visita. Efecto = borrado lógico de la
 * mesa (su código deja de valer y se cancelan reservas pendientes
 * legadas), exigiendo CERO pedidos activos.
 */
class CerrarMesaUseCase
{
    public function __construct(private MesaService $mesas) {}

    /**
     * @return int cantidad de reservas canceladas
     *
     * @throws \Exception si quedan pedidos activos en la mesa
     */
    public function __invoke(int $id): int
    {
        return $this->mesas->cerrarVisita($id);
    }
}
