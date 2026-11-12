<?php

namespace App\UseCases\Reservas;

use App\Services\ReservaService;
use Illuminate\Support\Collection;

/**
 * CASO DE USO: listar reservas con filtros opcionales
 * (GET /api/reservas?estado=&fecha=&mesa_id=&codigo=, permiso
 * gestionar_reservas). `codigo` es el PIN de 4 dígitos del cliente.
 */
class ListarReservasUseCase
{
    public function __construct(private ReservaService $reservas) {}

    public function __invoke(?string $estado, ?string $fecha, ?int $mesaId, ?string $codigo): Collection
    {
        return $this->reservas->obtenerListado($estado, $fecha, $mesaId, $codigo);
    }
}
