<?php

namespace App\UseCases\Reservas;

use App\Models\Reserva;
use App\Services\ReservaService;
use Illuminate\Database\Eloquent\ModelNotFoundException;

/**
 * CASO DE USO: crear una reserva DESDE EL RESTAURANTE (POST
 * /api/reservas, permiso gestionar_reservas). La mesa es obligatoria
 * (la elige el empleado con find estricto).
 *
 * @throws \Exception lead time, capacidad o conflicto (controller responde 422)
 * @throws ModelNotFoundException mesa inexistente
 */
class CrearReservaUseCase
{
    public function __construct(private ReservaService $reservas) {}

    /**
     * @param  array<string, mixed>  $datos
     */
    public function __invoke(array $datos): Reserva
    {
        return $this->reservas->crear($datos, esPublico: false);
    }
}
