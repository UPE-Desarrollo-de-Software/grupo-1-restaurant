<?php

namespace App\Http\Controllers;

use App\UseCases\Configuracion\ActualizarConfiguracionUseCase;
use App\UseCases\Configuracion\ActualizarDisponibilidadReservasUseCase;
use App\UseCases\Configuracion\ObtenerConfiguracionUseCase;
use App\UseCases\Configuracion\ObtenerDisponibilidadReservasUseCase;
use Illuminate\Http\Request;

/**
 * Configuración del restaurante (tabla CONFIG_MESA, DER del grupo).
 * Expone la composición del salón (piezas cantidad×capacidad), el
 * AFORO derivado (Σ capacidad×cantidad) y el tope de mesas (Σ
 * cantidad) que usan las mesas dinámicas.
 *
 * Además administra la DISPONIBILIDAD HORARIA DE RESERVAS (ventana +
 * intervalo de los turnos). Ojo: esa configuración NO vive en la base
 * de datos; se guarda en el archivo de runtime que maneja
 * DisponibilidadReservaService (ver su docblock para el ciclo de vida).
 */
class ConfiguracionController extends Controller
{
    public function __construct(
        private ObtenerConfiguracionUseCase $obtener,
        private ActualizarConfiguracionUseCase $actualizar,
        private ObtenerDisponibilidadReservasUseCase $obtenerDisponibilidad,
        private ActualizarDisponibilidadReservasUseCase $actualizarDisponibilidad,
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

    /**
     * GET /api/configuracion/disponibilidad (cualquier empleado).
     * Devuelve la ventana vigente de reservas + la grilla de turnos:
     * { hora_inicio, hora_fin, intervalo_minutos, anticipacion_horas,
     *   slots: ['09:00', ...], total_slots }.
     */
    public function showDisponibilidad()
    {
        return response()->json(($this->obtenerDisponibilidad)(), 200);
    }

    /**
     * PUT /api/configuracion/disponibilidad (permiso gestionar_mesas).
     * BODY { hora_inicio, hora_fin, intervalo_minutos }.
     *
     * No escribe en la base de datos: el cambio se guarda en el archivo
     * de runtime (sobrevive al reinicio del contenedor, se pierde al
     * redesplegar). Devuelve la configuración resultante con su grilla.
     */
    public function updateDisponibilidad(Request $request)
    {
        $datos = $request->validate([
            'hora_inicio' => 'required|string',
            'hora_fin' => 'required|string',
            'intervalo_minutos' => 'required|integer',
        ]);

        try {
            $disponibilidad = ($this->actualizarDisponibilidad)($datos);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'message' => 'Disponibilidad de reservas actualizada correctamente.',
            'disponibilidad' => $disponibilidad,
        ], 200);
    }
}
