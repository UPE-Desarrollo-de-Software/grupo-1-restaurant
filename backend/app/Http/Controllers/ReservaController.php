<?php

namespace App\Http\Controllers;

use App\Models\DetallePreOrden;
use App\UseCases\Reservas\ActualizarPreordenUseCase;
use App\UseCases\Reservas\ActualizarPreordenWebUseCase;
use App\UseCases\Reservas\CancelarReservaUseCase;
use App\UseCases\Reservas\ConvertirPreordenUseCase;
use App\UseCases\Reservas\CrearReservaUseCase;
use App\UseCases\Reservas\EliminarPreordenWebUseCase;
use App\UseCases\Reservas\FinalizarReservaUseCase;
use App\UseCases\Reservas\ListarReservasUseCase;
use App\UseCases\Reservas\MarcarNoAsistioUseCase;
use App\UseCases\Reservas\ObtenerPreordenReservaUseCase;
use App\UseCases\Reservas\ObtenerPreordenUseCase;
use App\UseCases\Reservas\ObtenerReservaUseCase;
use App\UseCases\Reservas\SolicitarReservaWebUseCase;
use App\UseCases\Reservas\VerDisponibilidadDiaReservaUseCase;
use App\UseCases\Reservas\VerDisponibilidadReservaUseCase;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

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
        private VerDisponibilidadDiaReservaUseCase $disponibilidadDia,
        private ListarReservasUseCase $listar,
        private ObtenerReservaUseCase $obtener,
        private CancelarReservaUseCase $cancelar,
        private FinalizarReservaUseCase $finalizar,
        private MarcarNoAsistioUseCase $noAsistio,
        private ObtenerPreordenUseCase $obtenerPreordenWeb,
        private ActualizarPreordenWebUseCase $actualizarPreordenWeb,
        private EliminarPreordenWebUseCase $eliminarPreordenWeb,
        private ObtenerPreordenReservaUseCase $obtenerPreorden,
        private ActualizarPreordenUseCase $actualizarPreorden,
        private ConvertirPreordenUseCase $convertirPreorden,
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
            'preorden' => 'sometimes|array',
            'preorden.*.plato_id' => 'required|integer|exists:platos,id',
            'preorden.*.cantidad' => 'required|integer|min:1',
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
            'preorden' => 'sometimes|array',
            'preorden.*.plato_id' => 'required|integer|exists:platos,id',
            'preorden.*.cantidad' => 'required|integer|min:1',
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
     * GET /api/cliente/reservas/disponibilidad-dia?fecha= (público con
     * throttle): grilla de turnos fijos (12:00–23:00 cada 30 min) con
     * el aforo libre de cada uno.
     */
    public function disponibilidadDia(Request $request)
    {
        $datos = $request->validate([
            'fecha' => 'required|date',
        ]);

        return response()->json(
            ($this->disponibilidadDia)($datos['fecha']),
            200
        );
    }

    /**
     * GET /api/reservas?estado=&fecha=&mesa_id=&codigo= (empleado):
     * filtros opcionales para la agenda del día o de la semana.
     * `codigo` es el PIN de 4 dígitos que muestra el cliente. Toda
     * reserva trae su `preorden` (qué viene para la llegada).
     */
    public function index(Request $request)
    {
        $datos = $request->validate([
            'estado' => 'sometimes|nullable|in:pendiente,cancelada,finalizada,no_asistio',
            'fecha' => 'sometimes|nullable|date_format:Y-m-d',
            'mesa_id' => 'sometimes|nullable|integer',
            'codigo' => ['sometimes', 'nullable', 'string', 'regex:/^\d{4}$/'],
        ]);

        $reservas = ($this->listar)(
            $datos['estado'] ?? null,
            $datos['fecha'] ?? null,
            isset($datos['mesa_id']) ? (int) $datos['mesa_id'] : null,
            $datos['codigo'] ?? null,
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

    // ==================== PRE-ORDEN ====================

    /**
     * GET /api/cliente/reservas/{codigo}/preordenes (público con
     * throttle): la pre-orden de la reserva con su PIN de 4 dígitos.
     * Mismo criterio que /acceso: PIN mal formado → 422, PIN que no
     * corresponde a ninguna reserva → 401.
     */
    public function preordenCliente(string $codigo)
    {
        if (! preg_match('/^\d{4}$/', $codigo)) {
            return response()->json(['message' => 'El PIN debe ser de exactamente 4 dígitos.'], 422);
        }

        try {
            $preordenes = ($this->obtenerPreordenWeb)($codigo);
        } catch (ModelNotFoundException) {
            return response()->json(['message' => 'PIN de reserva invalido o expirado.'], 401);
        }

        return response()->json($this->lineasPreorden($preordenes), 200);
    }

    /**
     * PUT /api/cliente/reservas/{codigo}/preordenes (público con
     * throttle): el cliente rearma su carrito mientras la reserva
     * siga pendiente (merge por plato_id).
     */
    public function actualizarPreordenCliente(string $codigo, Request $request)
    {
        if (! preg_match('/^\d{4}$/', $codigo)) {
            return response()->json(['message' => 'El PIN debe ser de exactamente 4 dígitos.'], 422);
        }

        $datos = $this->validarLineas($request);

        try {
            $preordenes = ($this->actualizarPreordenWeb)($codigo, $datos['preorden']);
        } catch (ModelNotFoundException) {
            return response()->json(['message' => 'PIN de reserva invalido o expirado.'], 401);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'mensaje' => 'Preorden actualizada correctamente',
            'preorden' => $this->lineasPreorden($preordenes),
        ], 200);
    }

    /**
     * DELETE /api/cliente/reservas/{codigo}/preordenes (público con
     * throttle): vacía la pre-orden mientras la reserva siga
     * pendiente.
     */
    public function eliminarPreordenCliente(string $codigo)
    {
        if (! preg_match('/^\d{4}$/', $codigo)) {
            return response()->json(['message' => 'El PIN debe ser de exactamente 4 dígitos.'], 422);
        }

        try {
            ($this->eliminarPreordenWeb)($codigo);
        } catch (ModelNotFoundException) {
            return response()->json(['message' => 'PIN de reserva invalido o expirado.'], 401);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json(['mensaje' => 'Preorden eliminada correctamente'], 200);
    }

    /**
     * GET /api/reservas/{id}/preordenes (empleado): la pre-orden de
     * la reserva (la agenda ya la trae en cada reserva).
     */
    public function preorden(int $id)
    {
        try {
            $preordenes = ($this->obtenerPreorden)($id);
        } catch (ModelNotFoundException) {
            return response()->json(['message' => 'Reserva no encontrada'], 404);
        }

        return response()->json($this->lineasPreorden($preordenes), 200);
    }

    /**
     * PUT /api/reservas/{id}/preordenes (empleado): rearmar el
     * carrito de la reserva (merge por plato_id, solo pendiente).
     */
    public function actualizarPreorden(int $id, Request $request)
    {
        $datos = $this->validarLineas($request);

        try {
            $preordenes = ($this->actualizarPreorden)($id, $datos['preorden']);
        } catch (ModelNotFoundException) {
            return response()->json(['message' => 'Reserva no encontrada'], 404);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'mensaje' => 'Preorden actualizada correctamente',
            'preorden' => $this->lineasPreorden($preordenes),
        ], 200);
    }

    /**
     * POST /api/reservas/{id}/preordenes/convertir (empleado):
     * respaldo manual de la conversión, por si el mozo creó la mesa
     * sin pasar `reserva_id`. Doble conversión → 422.
     */
    public function convertirPreordenEnPedido(int $id, Request $request)
    {
        $datos = $request->validate([
            'mesa_id' => 'required|integer|exists:mesas,id',
        ]);

        try {
            $pedido = ($this->convertirPreorden)($id, (int) $datos['mesa_id']);
        } catch (ModelNotFoundException) {
            return response()->json(['message' => 'Reserva no encontrada'], 404);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'mensaje' => 'Preorden convertida en pedido correctamente',
            'pedido' => $pedido,
        ], 200);
    }

    /**
     * Body de edición de pre-orden: { preorden: [{plato_id, cantidad}] }.
     *
     * @return array{preorden: array<int, array<string, mixed>>}
     */
    private function validarLineas(Request $request): array
    {
        return $request->validate([
            'preorden' => 'required|array',
            'preorden.*.plato_id' => 'required|integer|exists:platos,id',
            'preorden.*.cantidad' => 'required|integer|min:1',
        ]);
    }

    /**
     * Líneas en el shape del contrato del front
     * (`[{plato_id, cantidad}]`).
     *
     * @param  Collection<int, DetallePreOrden>  $preordenes
     * @return array<int, array{plato_id: int, cantidad: int}>
     */
    private function lineasPreorden(Collection $preordenes): array
    {
        return $preordenes
            ->map(fn ($linea): array => [
                'plato_id' => $linea->plato_id,
                'cantidad' => $linea->cantidad,
            ])
            ->values()
            ->all();
    }
}
