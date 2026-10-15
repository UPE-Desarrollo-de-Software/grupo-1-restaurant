<?php

namespace App\UseCases\Mesas;

use App\Models\Mesa;
use App\Services\MesaService;
use Illuminate\Database\Eloquent\ModelNotFoundException;

/**
 * CASO DE USO: actualizar una mesa (PUT /api/mesas/{id}, permiso
 * gestionar_mesas). El codigo_acceso nunca se toca. null = no existe.
 */
class ActualizarMesaUseCase
{
    public function __construct(private MesaService $mesas) {}

    /**
     * @param  array<string, mixed>  $datos
     */
    public function __invoke(int $id, array $datos): ?Mesa
    {
        try {
            return $this->mesas->actualizar($id, $datos);
        } catch (ModelNotFoundException) {
            return null;
        }
    }
}
