<?php

namespace App\Http\Controllers;

use App\Models\Mesa;
use App\UseCases\Clientes\AccederMesaUseCase;
use App\UseCases\Clientes\AgregarLineasClienteUseCase;
use App\UseCases\Clientes\ConfirmarLineasClienteUseCase;
use App\UseCases\Clientes\DesconfirmarLineasClienteUseCase;
use App\UseCases\Mesas\ObtenerCuentaMesaUseCase;
use App\UseCases\Mesas\ObtenerResumenMesaUseCase;
use App\UseCases\Pedidos\EnviarPedidoUseCase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;

/**
 * Auto-pedido del comensal (rebote de los profes: fuera CLIENTE).
 *
 * El comensal NO es un usuario ni un registro en la BD: entra con el
 * `codigo_acceso` de su mesa (POST /api/acceso) y lo manda en cada
 * request como `Authorization: Bearer <codigo>`. Su identidad en la
 * visita es el PEDIDO que creó, que el front guarda en el
 * localStorage (`pedido_id` / `pedido_padre_id`) y manda en el body.
 *
 * Flujo:
 *   POST /api/acceso              → valida el código (público, throttle)
 *   GET  /cliente/pedidos         → resumen (todos los pedidos de la mesa)
 *   POST /cliente/pedidos         → agrega SUS líneas (crea raíz o hijo)
 *   POST /cliente/pedidos/confirmar / desconfirmar → gate por línea
 *   GET  /cliente/cuenta          → cuenta en partes por pedido raíz
 */
class ClienteController extends Controller
{
    public function __construct(
        private AccederMesaUseCase $accederMesa,
        private ObtenerResumenMesaUseCase $obtenerResumen,
        private ObtenerCuentaMesaUseCase $obtenerCuenta,
        private AgregarLineasClienteUseCase $agregarLineas,
        private ConfirmarLineasClienteUseCase $confirmarLineas,
        private DesconfirmarLineasClienteUseCase $desconfirmarLineas,
        private EnviarPedidoUseCase $enviarPedido,
    ) {}

    /**
     * POST /api/acceso — público, con throttle. Body: { codigo }.
     * Devuelve la mesa para que el front guarde el código.
     */
    public function acceder(Request $request)
    {
        $datos = $request->validate([
            'codigo' => 'required|string|size:6',
        ]);

        // Throttle por IP: evita adivinar los 6 dígitos del código.
        $llave = 'acceso:'.ip2long($request->ip());
        if (RateLimiter::tooManyAttempts($llave, 10)) {
            return response()->json([
                'message' => 'Demasiados intentos: espera un momento y volvé a intentar.',
            ], 429);
        }
        RateLimiter::hit($llave, 60);

        // ApiException 401 si el código no corresponde a una mesa viva.
        $mesa = ($this->accederMesa)($datos['codigo']);

        return response()->json([
            'message' => 'Bienvenido a la mesa',
            'mesa' => [
                'id' => $mesa->id,
                'codigo_acceso' => $mesa->codigo_acceso,
                'estado' => $mesa->estado,
            ],
        ], 200);
    }

    /**
     * GET /cliente/pedidos — resumen de lectura de la mesa: TODOS los
     * pedidos de la visita con sus líneas y su `confirmado` por línea
     * (activos y también los cerrados/cancelados, con su `estado`;
     * el front ubica el suyo por el pedido_id guardado).
     */
    public function pedidos(Request $request)
    {
        /** @var Mesa $mesa */
        $mesa = $request->attributes->get('cliente_mesa');

        return response()->json(($this->obtenerResumen)($mesa->id), 200);
    }

    /**
     * POST /cliente/pedidos — agrega SUS líneas.
     *
     * Identidad en el body (localStorage del front):
     *  - `pedido_id` → agrega a su pedido en curso;
     *  - `pedido_padre_id` → crea un hijo de su primer pedido;
     *  - ninguno → crea su pedido RAÍZ (el front guarda su id).
     *
     * Las líneas nacen `confirmado = false`.
     */
    public function agregar(Request $request)
    {
        /** @var Mesa $mesa */
        $mesa = $request->attributes->get('cliente_mesa');

        $datos = $request->validate([
            'platos' => 'required|array|min:1',
            'platos.*.plato_id' => 'required|integer|exists:platos,id',
            'platos.*.cantidad' => 'required|integer|min:1',
            'platos.*.ingredientes' => 'nullable|array',
            'platos.*.ingredientes.*' => 'integer',
            'platos.*.excluir' => 'nullable|array',
            'platos.*.excluir.*' => 'integer',

            'pedido_id' => 'nullable|integer|exists:pedidos,id',
            'pedido_padre_id' => 'nullable|integer|exists:pedidos,id',
        ]);

        try {
            $pedido = ($this->agregarLineas)(
                $mesa->id,
                $datos['platos'],
                $datos['pedido_id'] ?? null,
                $datos['pedido_padre_id'] ?? null,
            );
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'mensaje' => 'Pedido actualizado correctamente.',
            'pedido' => $pedido,
        ], 201);
    }

    /**
     * POST /cliente/pedidos/confirmar — confirma las líneas de SU
     * pedido. Body: { pedido_id, detalle_ids? } (sin detalle_ids →
     * todas las de ese pedido).
     */
    public function confirmar(Request $request)
    {
        return $this->marcarLineas($request, true);
    }

    /**
     * POST /cliente/pedidos/desconfirmar — deshace la confirmación
     * (solo mientras su pedido está en curso).
     */
    public function desconfirmar(Request $request)
    {
        return $this->marcarLineas($request, false);
    }

    /**
     * GET /cliente/cuenta — cuenta dividida en PARTES por pedido raíz
     * (el front identifica SU parte con el pedido raíz guardado).
     */
    public function cuenta(Request $request)
    {
        /** @var Mesa $mesa */
        $mesa = $request->attributes->get('cliente_mesa');

        return response()->json(($this->obtenerCuenta)($mesa->id), 200);
    }

    /**
     * Confirmar / desconfirmar líneas de SU pedido en la mesa.
     */
    private function marcarLineas(Request $request, bool $confirmado)
    {
        /** @var Mesa $mesa */
        $mesa = $request->attributes->get('cliente_mesa');

        $datos = $request->validate([
            'pedido_id' => 'required|integer|exists:pedidos,id',
            'detalle_ids' => 'nullable|array',
            'detalle_ids.*' => 'integer',
        ]);

        try {
            $pedido = $confirmado
                ? ($this->confirmarLineas)($mesa->id, $datos['pedido_id'], $datos['detalle_ids'] ?? null)
                : ($this->desconfirmarLineas)($mesa->id, $datos['pedido_id'], $datos['detalle_ids'] ?? null);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'mensaje' => $confirmado ? 'Lineas confirmadas.' : 'Lineas desconfirmadas.',
            'pedido' => $pedido,
        ], 200);
    }

    public function enviarPedido(Request $request) {}
}
