<?php

namespace App\UseCases\Mesas;

use App\Services\MesaService;
use Illuminate\Database\Eloquent\ModelNotFoundException;

/**
 * CASO DE USO: destruir una mesa (DELETE /api/mesas/{id}, permiso
 * gestionar_mesas). Borrado LÓGICO: los pedidos históricos conservan
 * su FK y la app deja de ver la mesa. Antes se cancelan sus reservas
 * pendientes. false = no existe.
 */
class EliminarMesaUseCase
{
    public function __construct(private MesaService $mesas) {}

    /**
     * @return int|false cantidad de reservas canceladas
     */
    public function __invoke(int $id): int|false
    {
        try {
            return $this->mesas->eliminar($id);
        } catch (ModelNotFoundException) {
            return false;
        }
    }
}
