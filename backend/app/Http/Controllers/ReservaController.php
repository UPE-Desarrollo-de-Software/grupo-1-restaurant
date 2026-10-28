<?php

namespace App\Http\Controllers;

use App\UseCases\Reservas\CancelarReservaUseCase;
use App\UseCases\Reservas\CrearReservaUseCase;
use App\UseCases\Reservas\FinalizarReservaUseCase;
use App\UseCases\Reservas\ListarReservasUseCase;
use App\UseCases\Reservas\MarcarNoAsistioUseCase;
use App\UseCases\Reservas\ObtenerReservaUseCase;
use App\UseCases\Reservas\SolicitarReservaWebUseCase;
use App\UseCases\Reservas\VerDisponibilidadReservaUseCase;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\Request;

/**
 * RESERVAS (DER v3.0).
 *
 * La reserva NO apunta a una mesa: es un hold sobre el INVENTARIO del
 * salón (CONFIG_MESA − pendientes del horario), con la combinación de
 * capacidades guardada en `reserva_inventario`. El empleado y el
 * cliente piden personas + horario; la llegada del cliente es
 * `finalizar()` (libera el hold y el mozo arma las mesas a partir de
 * `inventario`). "No encontrado" responde 404 (como
 * IngredienteController) y las reglas de negocio 422.
 */
class ReservaController extends Controller
{
    public function __construct(
        private CrearReservaUseCase $crear,
        private SolicitarReservaWebUseCase $solicitarWeb,
        private VerDisponibilidadReservaUseCase $disponibilidad,
        private ListarReservasUseCase $listar,
        private ObtenerReservaUseCase $obtener,
        private CancelarReservaUseCase $cancelar,
        private FinalizarReservaUseCase $finalizar,
        private MarcarNoAsistioUseCase $noAsistio,
    ) {}

    /**
     * POST /api/reservas (empleado): pide personas + horario; el
     * sistema asigna la combinación de capacidades disponible.
     */
    public function store(Request $request)
    {
        $datos = $request->validate([
            'contacto_solicitante' => 'required|string|max:255',
            'fecha' => 'required|date',
            'hora' => ['required', 'regex:/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/'],
            'cantPersonas' => 'required|integer|min:1',
        ]);

        try {
            $reserva = ($this->crear)($datos);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'mensaje' => 'Reserva creada correctamente.',
            'reserva' => $reserva,
        ], 201);
    }

    /**
     * POST /api/cliente/reservas (público con throttle): misma lógica
     * que la del empleado (sin mesa que elegir).
     */
    public function solicitarWeb(Request $request)
    {
        $datos = $request->validate([
            'contacto_solicitante' => 'required|string|max:255',
            'fecha' => 'required|date',
            'hora' => ['required', 'regex:/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/'],
            'cantPersonas' => 'required|integer|min:1',
        ]);

        try {
            $reserva = ($this->solicitarWeb)($datos);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'mensaje' => 'Reserva pedida correctamente. Guarda el id de tu reserva para el local.',
            'reserva' => $reserva,
        ], 201);
    }

    /**
     * GET /api/cliente/reservas/disponibilidad?fecha=&hora= (público
     * con throttle): qué capacidades quedan libres para ese intervalo
     * (reemplaza al mapa de elección de mesas).
     */
    public function disponibilidad(Request $request)
    {
        $datos = $request->validate([
            'fecha' => 'required|date',
            'hora' => ['required', 'regex:/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/'],
        ]);

        return response()->json(
            ($this->disponibilidad)($datos['fecha'], $datos['hora']),
            200
        );
    }

    /**
     * GET /api/reservas?estado=&fecha=&mesa_id= (empleado): filtros
     * opcionales para la agenda del día o de la semana.
     */
    public function index(Request $request)
    {
        $datos = $request->validate([
            'estado' => 'sometimes|nullable|in:pendiente,cancelada,finalizada,no_asistio',
            'fecha' => 'sometimes|nullable|date_format:Y-m-d',
            'mesa_id' => 'sometimes|nullable|integer',
        ]);

        $reservas = ($this->listar)(
            $datos['estado'] ?? null,
            $datos['fecha'] ?? null,
            isset($datos['mesa_id']) ? (int) $datos['mesa_id'] : null,
        );

        if ($reservas->isEmpty()) {
            return response()->json(['message' => 'No se encontraron reservas'], 200);
        }

        return response()->json($reservas, 200);
    }

    /**
     * GET /api/reservas/{id} (empleado): detalle con su mesa.
     */
    public function show(int $id)
    {
        try {
            return response()->json(($this->obtener)($id), 200);
        } catch (ModelNotFoundException) {
            return response()->json(['message' => 'Reserva no encontrada'], 404);
        }
    }

    /**
     * PATCH /api/reservas/{id}/cancelar: pendiente → cancelada; el
     * hold de inventario queda libre.
     */
    public function cancelar(int $id)
    {
        try {
            $reserva = ($this->cancelar)($id);
        } catch (ModelNotFoundException) {
            return response()->json(['message' => 'Reserva no encontrada'], 404);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'mensaje' => 'Reserva cancelada correctamente',
            'reserva' => $reserva,
        ], 200);
    }

    /**
     * PATCH /api/reservas/{id}/finalizar: LLEGADA DEL CLIENTE
     * (pendiente → finalizada). La reserva muere: el hold de
     * inventario queda libre y `inventario` indica qué mesas arma el
     * mozo. No exige hora pasada (puede llegar temprano).
     */
    public function finalizar(int $id)
    {
        try {
            $reserva = ($this->finalizar)($id);
        } catch (ModelNotFoundException) {
            return response()->json(['message' => 'Reserva no encontrada'], 404);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'mensaje' => 'Llegada registrada: reserva finalizada e inventario liberado',
            'reserva' => $reserva,
        ], 200);
    }

    /**
     * PATCH /api/reservas/{id}/inasistio: pendiente → no_asistio (el
     * cliente no vino), solo después de la hora.
     */
    public function inasistio(int $id)
    {
        try {
            $reserva = ($this->noAsistio)($id);
        } catch (ModelNotFoundException) {
            return response()->json(['message' => 'Reserva no encontrada'], 404);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'mensaje' => 'Inasistencia registrada',
            'reserva' => $reserva,
        ], 200);
    }
}
