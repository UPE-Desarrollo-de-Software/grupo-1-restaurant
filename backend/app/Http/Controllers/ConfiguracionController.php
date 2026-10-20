<?php

namespace App\Http\Controllers;

use App\UseCases\Configuracion\ActualizarConfiguracionUseCase;
use App\UseCases\Configuracion\ObtenerConfiguracionUseCase;
use Illuminate\Http\Request;

/**
 * Configuración del restaurante (tabla CONFIG_MESA, DER del grupo).
 * Expone la composición del salón (piezas cantidad×capacidad), el
 * AFORO derivado (Σ capacidad×cantidad) y el tope de mesas (Σ
 * cantidad) que usan las mesas dinámicas.
 */
class ConfiguracionController extends Controller
{
    public function __construct(
        private ObtenerConfiguracionUseCase $obtener,
        private ActualizarConfiguracionUseCase $actualizar,
    ) {}

    /**
     * GET /api/configuracion (cualquier empleado autenticado).
     * Devuelve { config_mesas: [...], aforo, mesas_maximas }.
     */
    public function show()
    {
        return response()->json(($this->obtener)(), 200);
    }

    /**
     * PUT /api/configuracion (permiso gestionar_mesas). REPLACE-ALL:
     * BODY { config_mesas: [{cantidad, capacidad}, ...] }. El aforo
     * no puede quedar por debajo de la capacidad de las mesas vivas
     * ni el tope de mesas por debajo de las vivas (422).
     */
    public function update(Request $request)
    {
        $datos = $request->validate([
            'config_mesas' => 'required|array|min:1',
            'config_mesas.*.cantidad' => 'required|integer|min:1',
            'config_mesas.*.capacidad' => 'required|integer|min:1',
        ]);

        try {
            $configuracion = ($this->actualizar)($datos);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'message' => 'Configuracion actualizada exitosamente',
            'configuracion' => $configuracion,
        ], 200);
    }
}
