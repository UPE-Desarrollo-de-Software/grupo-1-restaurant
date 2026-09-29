<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\PedidoService;

class PedidoController extends Controller
{
    public function agregarProducto(Request $request, PedidoService $pedidoService)
    {
        $request->validate([
            'session_id' => 'required|string',
            'producto_id' => 'required|integer',
            'cantidad' => 'required|integer|min:1',
            'ingredientes' => 'nullable|array',
            'ingredientes.*' => 'integer',//cada ingrediente dentro del array ingredientes tiene que ser un entero
        ]);

        $detalle = $pedidoService->agregarProducto(
            $request->session_id,
            $request->producto_id,
            $request->cantidad,
            $request->ingredientes ?? []
        );

        return response()->json([
            'mensaje' => 'Producto agregado correctamente.',
            'detalle' => $detalle
        ], 201);
    }
}
