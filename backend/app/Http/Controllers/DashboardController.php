<?php

namespace App\Http\Controllers;

use App\UseCases\Reportes\ObtenerDashboardUseCase;
use Illuminate\Http\Request;

/**
 * DASHBOARD de estadísticas (módulo Reportes).
 *
 * Ventas del período, pedidos por estado, platos más vendidos,
 * ocupación actual y reservas de hoy. Permiso `ver_dashboard` (solo
 * Gerente).
 */
class DashboardController extends Controller
{
    public function __construct(
        private ObtenerDashboardUseCase $dashboard,
    ) {}

    /**
     * GET /api/dashboard?desde=&hasta= (ambos opcionales, default
     * hoy; período máximo 366 días → 422).
     */
    public function index(Request $request)
    {
        $datos = $request->validate([
            'desde' => 'sometimes|nullable|date_format:Y-m-d',
            'hasta' => 'sometimes|nullable|date_format:Y-m-d',
        ]);

        try {
            return response()->json(($this->dashboard)($datos), 200);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }
}
