<?php

namespace App\UseCases\Reportes;

use App\Services\ReporteService;
use Illuminate\Support\Carbon;

/**
 * CASO DE USO: dashboard de estadísticas (GET /api/dashboard, permiso
 * ver_dashboard). Valida el período y delega los cálculos en
 * ReporteService.
 */
class ObtenerDashboardUseCase
{
    public function __construct(private ReporteService $reportes) {}

    /**
     * @param  array{desde?: string|null, hasta?: string|null}  $datos
     * @return array<string, mixed>
     *
     * @throws \Exception período incoherente o demasiado largo
     */
    public function __invoke(array $datos): array
    {
        $desde = $datos['desde'] ?? now()->toDateString();
        $hasta = $datos['hasta'] ?? now()->toDateString();

        if ($desde > $hasta) {
            throw new \Exception('El desde no puede ser posterior al hasta.');
        }

        if (Carbon::parse($desde)->diffInDays(Carbon::parse($hasta)) > 366) {
            throw new \Exception('El período no puede superar los 366 días.');
        }

        return $this->reportes->dashboard($desde, $hasta);
    }
}
