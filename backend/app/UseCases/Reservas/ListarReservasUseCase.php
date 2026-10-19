<?php

namespace App\UseCases\Reservas;

use App\Services\ReservaService;
use Illuminate\Support\Collection;

/**
 * CASO DE USO: listar reservas con filtros opcionales
 * (GET /api/reservas?estado=&fecha=&mesa_id=, permiso
 * gestionar_reservas).
 */
class ListarReservasUseCase
{
    public function __construct(private ReservaService $reservas) {}

    public function __invoke(?string $estado, ?string $fecha, ?int $mesaId): Collection
    {
        return $this->reservas->obtenerListado($estado, $fecha, $mesaId);
    }
}
