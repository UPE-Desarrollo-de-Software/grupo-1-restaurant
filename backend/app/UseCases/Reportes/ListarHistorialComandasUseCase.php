<?php

namespace App\UseCases\Reportes;

use App\Services\ReporteService;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

/**
 * CASO DE USO: historial de comandas paginado
 * (GET /api/historial/comandas, permiso ver_historial_comandas).
 *
 * La comanda = PEDIDO con sus líneas y su mesa (aunque haya sido
 * destruida). Sin filtro `estado` se listan solo los finalizados.
 */
class ListarHistorialComandasUseCase
{
    public function __construct(private ReporteService $reportes) {}

    /**
     * @param  array{desde?: string|null, hasta?: string|null, estado?: string|null, mesa_id?: int|null, page?: int, per_page?: int}  $datos
     * @return LengthAwarePaginator<int, array<string, mixed>>
     */
    public function __invoke(array $datos): LengthAwarePaginator
    {
        return $this->reportes->historial($datos);
    }
}
