<?php

namespace App\Http\Controllers;

use App\Models\Mesa;
use App\Models\Pedido;
use App\Services\PedidoService;
use Illuminate\Http\Request;

/**
 * Pedidos de una mesa (DER v2.1). Antes los pedidos vivían colgados de
 * una SESIÓN de clientes; ahora cuelgan de la MESA y los toma el mozo.
 */
class PedidoController extends Controller
{
    /**
     * GET /api/mesas/{mesa}/pedido-activo
     * Pedido no finalizado de la mesa, con sus líneas.
     */
    public function pedidoActivo(Mesa $mesa, PedidoService $pedidoService)
    {
        $pedido = $pedidoService->pedidoActivoDeMesa($mesa->id);

        if (! $pedido) {
            return response()->json([
                'message' => 'La mesa no tiene un pedido activo.',
                'pedido' => null,
            ], 200);
        }

        return response()->json(['pedido' => $pedido], 200);
    }

    /**
     * POST /api/mesas/{mesa}/pedidos
     * Agrega líneas al pedido en curso de la mesa (lo crea si no existe).
     */
    public function agregarProducto(Request $request, Mesa $mesa, PedidoService $pedidoService)
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
        ]);

        try {
            $pedido = $pedidoService->agregarProducto($mesa->id, $request->platos);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'mensaje' => 'Pedido actualizado correctamente.',
            'pedido' => $pedido,
        ], 201);
    }

    /**
     * POST /api/pedidos/{pedido}/enviar
     * Envia el pedido en curso a cocina (estado "enviado").
     */
    public function enviarPedido(Pedido $pedido, PedidoService $pedidoService)
    {
        try {
            $pedido = $pedidoService->enviarPedido($pedido->id);
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
     * Avanza el pedido por el flujo del DER o lo cancela.
     */
    public function cambiarEstado(Request $request, Pedido $pedido, PedidoService $pedidoService)
    {
        $request->validate([
            'estado' => 'required|in:enviado,en_preparacion,entregado,cerrado,cancelado',
        ]);

        try {
            $pedido = $pedidoService->cambiarEstado($pedido->id, $request->estado);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'mensaje' => "Pedido ahora esta '{$pedido->estado}'.",
            'pedido' => $pedido,
        ], 200);
    }
}
