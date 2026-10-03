<?php

namespace App\Http\Controllers;

use App\Services\PedidoService;
use Illuminate\Http\Request;

class PedidoController extends Controller
{
    public function agregarProducto(Request $request, PedidoService $pedidoService)
    {
        $request->validate([
            'sesion_id' => 'required|integer',

            'productos' => 'required|array|min:1',

            'productos.*.producto_id' => 'required|integer', // cada producto dentro del array
            'productos.*.cantidad' => 'required|integer|min:1',
            'productos.*.ingredientes' => 'nullable|array',
            'productos.*.ingredientes.*' => 'integer', // cada ingrediente dentro del array ingredientes tiene que ser un entero
        ]);

        $cliente = $request->user();

        $pedido = $pedidoService->agregarProducto(
            $request->sesion_id,
            $request->productos,
            $cliente->id
        );

        return response()->json([
            'mensaje' => 'Producto agregado correctamente.',
            'pedido' => $pedido,
        ], 201);
    }

    public function enviarPedido(Request $request, PedidoService $pedidoService)
    {
        $request->validate([
            'sesion_id' => 'required|integer',
        ]);

        $pedido = $pedidoService->enviarPedido($request->sesion_id);

        return response()->json([
            'mensaje' => 'Pedido enviado correctamente.',
            'pedido' => $pedido,
        ], 200);
    }
}
