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
            'producto_id' => 'required|integer',
            'cantidad' => 'required|integer|min:1',
            'ingredientes' => 'nullable|array',
            'ingredientes.*' => 'integer', // cada ingrediente dentro del array ingredientes tiene que ser un entero

        ]);
        $cliente = $request->user();

        $detalle = $pedidoService->agregarProducto(
            $request->sesion_id,
            $request->producto_id,
            $request->cantidad,
            $request->ingredientes ?? [],
            $cliente->id

        );

        return response()->json([
            'mensaje' => 'Producto agregado correctamente.',
            'detalle' => $detalle,
        ], 201);
    }
}
