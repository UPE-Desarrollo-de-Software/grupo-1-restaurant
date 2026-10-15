<?php

namespace App\UseCases\Mesas;

use App\Services\MesaService;
use Illuminate\Database\Eloquent\ModelNotFoundException;

/**
 * CASO DE USO: destruir una mesa (DELETE /api/mesas/{id}, permiso
 * gestionar_mesas). Borrado LÓGICO: los pedidos históricos conservan
 * su FK y la app deja de ver la mesa. null = no existe.
 */
class EliminarMesaUseCase
{
    public function __construct(private MesaService $mesas) {}

    public function __invoke(int $id): bool
    {
        try {
            $this->mesas->eliminar($id);

            return true;
        } catch (ModelNotFoundException) {
            return false;
        }
    }
}
