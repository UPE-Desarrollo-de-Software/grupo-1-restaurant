<?php

namespace App\UseCases\Mesas;

use App\Models\Mesa;
use App\Services\MesaService;

/**
 * CASO DE USO: crear una mesa dinámica (POST /api/mesas, permiso
 * tomar_pedidos: la crea el mozo o la reserva). Valida el AFORO y
 * genera el codigo_acceso único dentro del service.
 *
 * @throws \Exception aforo superado (controller responde 422)
 */
class CrearMesaUseCase
{
    public function __construct(private MesaService $mesas) {}

    /**
     * @param  array<string, mixed>  $datos
     */
    public function __invoke(array $datos): Mesa
    {
        return $this->mesas->crearMesa($datos);
    }
}
