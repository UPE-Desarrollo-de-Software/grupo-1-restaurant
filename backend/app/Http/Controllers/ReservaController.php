<?php

namespace App\Http\Controllers;

use App\Models\Mesa;
use App\UseCases\Mesas\ListarMesasUseCase;
use App\UseCases\Reservas\CancelarReservaUseCase;
use App\UseCases\Reservas\CancelarReservaWebUseCase;
use App\UseCases\Reservas\CrearReservaUseCase;
use App\UseCases\Reservas\FinalizarReservaUseCase;
use App\UseCases\Reservas\ListarReservasUseCase;
use App\UseCases\Reservas\MarcarNoAsistioUseCase;
use App\UseCases\Reservas\ObtenerReservaUseCase;
use App\UseCases\Reservas\SolicitarReservaWebUseCase;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\Request;

/**
 * RESERVAS (DER v3.0).
 *
 * Dos altas: la del empleado (mesa obligatoria) y la del cliente por
 * la web (mesa opcional: si no elige, la crea el "mozo virtual"
 * validando el aforo). "No encontrado" responde 404 (como
 * IngredienteController) y las reglas de negocio 422.
 */
class ReservaController extends Controller
{
    public function __construct(
        private CrearReservaUseCase $crear,
        private SolicitarReservaWebUseCase $solicitarWeb,
        private CancelarReservaWebUseCase $cancelarWeb,
        private ListarReservasUseCase $listar,
        private ObtenerReservaUseCase $obtener,
        private CancelarReservaUseCase $cancelar,
        private FinalizarReservaUseCase $finalizar,
        private MarcarNoAsistioUseCase $noAsistio,
        private ListarMesasUseCase $listarMesas,
    ) {}

    /**
     * POST /api/reservas (empleado): la mesa es obligatoria y se
     * resuelve con find estricto (jamás crea mesas).
     */
    public function store(Request $request)
    {
        $datos = $request->validate([
            'mesa_id' => 'required|integer',
            'contacto_solicitante' => 'required|string|max:255',
            'fecha' => 'required|date',
            'hora' => ['required', 'regex:/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/'],
            'cantPersonas' => 'required|integer|min:1',
        ]);

        try {
            $reserva = ($this->crear)($datos);
        } catch (ModelNotFoundException) {
            return response()->json(['message' => 'Mesa no encontrada'], 404);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'mensaje' => 'Reserva creada correctamente.',
            'reserva' => $reserva,
        ], 201);
    }

    /**
     * POST /api/cliente/reservas (público con throttle): si no viene
     * mesa_id, la crea el sistema como "mozo virtual" (valida el
     * aforo); nunca es el cliente el que inserta la mesa.
     */
    public function solicitarWeb(Request $request)
    {
        $datos = $request->validate([
            'mesa_id' => 'nullable|integer',
            'contacto_solicitante' => 'required|string|max:255',
            'fecha' => 'required|date',
            'hora' => ['required', 'regex:/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/'],
            'cantPersonas' => 'required|integer|min:1',
        ]);

        try {
            $reserva = ($this->solicitarWeb)($datos);
        } catch (ModelNotFoundException) {
            return response()->json(['message' => 'Mesa no encontrada'], 404);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'mensaje' => 'Reserva pedida correctamente. Guarda el id de tu reserva para el local.',
            'reserva' => $reserva,
        ], 201);
    }

    /**
     * POST /api/cliente/reservas/cancelar (público con throttle
     * estricto): el codigo_acceso de la mesa cancela todas sus reservas
     * pendientes. Un mismo 422 responde si el código no vale o si no
     * hay pendientes (no revela cuál fue el problema).
     */
    public function cancelarWeb(Request $request)
    {
        $datos = $request->validate([
            'codigo' => 'required|string|size:4',
        ]);

        try {
            $reservas = ($this->cancelarWeb)($datos['codigo']);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'mensaje' => 'Reservas canceladas correctamente',
            'reservas' => $reservas,
        ], 200);
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
     * PATCH /api/reservas/{id}/cancelar: pendiente → cancelada (si era
     * de hoy, la mesa vuelve a 'libre').
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
     * PATCH /api/reservas/{id}/finalizar: pendiente → finalizada, solo
     * después de la hora de la reserva.
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
            'mensaje' => 'Reserva finalizada correctamente',
            'reserva' => $reserva,
        ], 200);
    }

    /**
     * PATCH /api/reservas/{id}/inasistio: pendiente → no_asistio (el
     * cliente no vino), también solo después de la hora.
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

    /**
     * GET /api/cliente/reservas/mesas (público): mesas precreadas para
     * el mapa de elección (estilo cine). SOLO id/capacidad/estado: el
     * codigo_acceso NUNCA sale en una ruta pública.
     */
    public function mesasParaElegir()
    {
        $mesas = ($this->listarMesas)()
            ->map(fn (Mesa $mesa) => [
                'id' => $mesa->id,
                'capacidad' => $mesa->capacidad,
                'estado' => $mesa->estado,
            ])
            ->values();

        return response()->json($mesas, 200);
    }
}
