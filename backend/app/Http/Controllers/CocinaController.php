<?php

namespace App\Http\Controllers;

use App\UseCases\Cocina\AvanzarPedidoCocinaUseCase;
use App\UseCases\Cocina\ListarPedidosCocinaUseCase;
use Illuminate\Http\Request;

/**
 * COCINA (permiso preparar_pedidos: único de Cocina; Gerente lo
 * hereda por 'todos' pero no lo usa desde la UI).
 *
 * La cocina solo VE la cola (enviado + en_preparacion) y solo
 * AVANZA su tramo del flujo:
 *   enviado → en_preparacion → listo
 * El resto de los estados (entregado, cerrado, cancel, reabrir) los
 * maneja el mozo con PedidoController@cambiarEstado.
 */
class CocinaController extends Controller
{
    public function __construct(
        private ListarPedidosCocinaUseCase $listar,
        private AvanzarPedidoCocinaUseCase $avanzar,
    ) {}

    /**
     * GET /api/cocina/pedidos — cola de cocina: { pedidos: [...] },
     * con sus líneas y su mesa, en orden de llegada.
     */
    public function index()
    {
        $pedidos = ($this->listar)();

        return response()->json(['pedidos' => $pedidos], 200);
    }

    /**
     * PUT /api/cocina/pedidos/{id}/estado — solo admite
     * en_preparacion | listo (422 si el salto no corresponde).
     */
    public function cambiarEstado(Request $request, string $id)
    {
        $request->validate([
            'estado' => 'required|in:en_preparacion,listo',
        ]);

        try {
            $pedido = ($this->avanzar)((int) $id, $request->estado);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'mensaje' => "Pedido ahora esta '{$pedido->estado}'.",
            'pedido' => $pedido,
        ], 200);
    }
}
