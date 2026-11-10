<?php

namespace App\UseCases\Mesas;

use App\Models\Mesa;
use App\Services\MesaService;

/**
 * CASO DE USO: crear una mesa dinámica (POST /api/mesas, permiso
 * tomar_pedidos: la crea el mozo o la reserva). Valida el AFORO y
 * genera el codigo_acceso único dentro del service.
 *
 * `reserva_id` (opcional): arma la mesa para esa reserva (pendiente
 * o finalizada, si no → 422). La primera mesa de la reserva hereda
 * el PIN de la reserva como codigo_acceso (fallback si ya está
 * tomado); la resolución vive en MesaService::crearMesa.
 *
 * @throws \Exception aforo superado o reserva inválida (controller responde 422)
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
