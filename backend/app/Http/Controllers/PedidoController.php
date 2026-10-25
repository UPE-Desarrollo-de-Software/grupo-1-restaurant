<?php

namespace App\Http\Controllers;

use App\Models\Mesa;
use App\Models\Pedido;
use App\UseCases\Mesas\ObtenerPedidosMesaUseCase;
use App\UseCases\Pedidos\AgregarLineasPedidoUseCase;
use App\UseCases\Pedidos\CambiarEstadoPedidoUseCase;
use App\UseCases\Pedidos\ConfirmarResumenPedidoUseCase;
use App\UseCases\Pedidos\EnviarPedidoUseCase;
use Illuminate\Http\Request;

/**
 * Pedidos de una mesa (DER v2.2).
 *
 * Varios pedidos activos por mesa (uno por comensal): cada alta crea
 * una RAÍZ nueva salvo que se indique `pedido_id` para seguir uno en
 * curso. Envío en 2 pasos: confirmar (gate de `confirmado` por línea)
 * y recién después enviar a cocina.
 */
class PedidoController extends Controller
{
    public function __construct(
        private ObtenerPedidosMesaUseCase $pedidosDeMesa,
        private AgregarLineasPedidoUseCase $agregarLineas,
        private ConfirmarResumenPedidoUseCase $confirmarResumen,
        private EnviarPedidoUseCase $enviarPedido,
        private CambiarEstadoPedidoUseCase $cambiarEstado,
    ) {}

    /**
     * GET /api/mesas/{mesa}/pedido-activo
     * Pedidos no finalizados de la mesa con sus líneas: { pedidos: [...] }
     * (vacío si no hay; ya no existe "el" pedido único de la mesa).
     */
    public function pedidoActivo(Mesa $mesa)
    {
        return response()->json(($this->pedidosDeMesa)($mesa->id), 200);
    }

    /**
     * POST /api/mesas/{mesa}/pedidos
     * Alta de líneas del mozo. Sin `pedido_id` crea una raíz nueva;
     * con `pedido_id` agrega a ese pedido si está en curso. Las líneas
     * del mozo nacen confirmadas (pasan el gate solas).
     */
    public function agregarProducto(Request $request, Mesa $mesa)
    {
        $request->validate([
            'platos' => 'required|array|min:1',

            // Una línea por plato pedido.
            'platos.*.plato_id' => 'required|integer|exists:platos,id',
            'platos.*.cantidad' => 'required|integer|min:1',

            // Ingredientes a AGREGAR (solo los marcados opcional en PLATO_INGREDIENTE).
            'platos.*.ingredientes' => 'nullable|array',
            'platos.*.ingredientes.*' => 'integer',

            // Ingredientes a EXCLUIR (solo los marcados por_defecto).
            'platos.*.excluir' => 'nullable|array',
            'platos.*.excluir.*' => 'integer',

            // Pedido en curso a que se suman las líneas (opcional).
            'pedido_id' => 'nullable|integer|exists:pedidos,id',
        ]);

        try {
            $pedido = ($this->agregarLineas)(
                $mesa->id,
                $request->platos,
                $request->integer('pedido_id') ?: null,
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
     * POST /api/pedidos/{pedido}/confirmar — 1er paso del envío: gate
     * de que ninguna línea siga sin confirmar (o `forzar: true`).
     * Deja el pedido en estado "confirmado".
     */
    public function confirmar(Request $request, Pedido $pedido)
    {
        $datos = $request->validate([
            'forzar' => 'nullable|boolean',
        ]);

        try {
            $pedido = ($this->confirmarResumen)($pedido->id, (bool) ($datos['forzar'] ?? false));
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'mensaje' => 'Pedido confirmado: ya podes enviarlo a cocina.',
            'pedido' => $pedido,
        ], 200);
    }

    /**
     * POST /api/pedidos/{pedido}/enviar
     * 2do paso del envío: pasa "confirmado" → "enviado" (a cocina).
     */
    public function enviarPedido(Pedido $pedido)
    {
        try {
            $pedido = ($this->enviarPedido)($pedido->id);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'mensaje' => 'Pedido enviado correctamente.',
            'pedido' => $pedido,
        ], 200);
    }

    /**
     * PUT /api/pedidos/{pedido}/estado
     * Avanza el flujo del mozo (listo → entregado → cerrado), reabre
     * (confirmado → en_curso) o cancela desde cualquier estado no
     * final. NO toca la cocina: en_preparacion y los saltos de cocina
     * los hace la cocina (PUT /api/cocina/pedidos/{id}/estado).
     */
    public function cambiarEstado(Request $request, Pedido $pedido)
    {
        $request->validate([
            'estado' => 'required|in:en_curso,entregado,cerrado,cancelado',
        ]);

        try {
            $pedido = ($this->cambiarEstado)($pedido->id, $request->estado);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'mensaje' => "Pedido ahora esta '{$pedido->estado}'.",
            'pedido' => $pedido,
        ], 200);
    }
}
