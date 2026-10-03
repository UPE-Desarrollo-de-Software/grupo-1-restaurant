<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\PedidoService;

class PedidoController extends Controller
{
    public function agregarProductos(Request $request, PedidoService $pedidoService)
    {
        $request->validate([
            'sesion_id' => 'required|integer',

            'productos' => 'required|array|min:1',

            'productos.*.producto_id' => 'required|integer',//cada producto dentro del array
            'productos.*.cantidad' => 'required|integer|min:1',
            'productos.*.ingredientes' => 'nullable|array',
            'productos.*.ingredientes.*' => 'integer',//cada ingrediente dentro del array ingredientes tiene que ser un entero
        ]);

        $pedido = $pedidoService->agregarProductos(
            $request->sesion_id,
            $request->productos
        );

        return response()->json([
            'mensaje' => 'Producto agregado correctamente.',
            'pedido' => $pedido
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
            'pedido' => $pedido
        ], 200);
    }
}
