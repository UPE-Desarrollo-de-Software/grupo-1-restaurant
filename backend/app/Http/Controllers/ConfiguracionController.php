<?php

namespace App\Http\Controllers;

use App\UseCases\Configuracion\ActualizarConfiguracionUseCase;
use App\UseCases\Configuracion\ObtenerConfiguracionUseCase;
use Illuminate\Http\Request;

/**
 * Configuración del restaurante (tabla PARAMETRO, DER v2.2).
 * Hoy expone el aforo `capacidad_total` que usan las mesas dinámicas.
 */
class ConfiguracionController extends Controller
{
    public function __construct(
        private ObtenerConfiguracionUseCase $obtener,
        private ActualizarConfiguracionUseCase $actualizar,
    ) {}

    /**
     * GET /api/configuracion (cualquier empleado autenticado).
     */
    public function show()
    {
        return response()->json(($this->obtener)(), 200);
    }

    /**
     * PUT /api/configuracion (permiso gestionar_mesas). El aforo no
     * puede quedar por debajo de la capacidad de las mesas vivas (422).
     */
    public function update(Request $request)
    {
        $datos = $request->validate([
            'capacidad_total' => 'required|integer|min:0',
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
