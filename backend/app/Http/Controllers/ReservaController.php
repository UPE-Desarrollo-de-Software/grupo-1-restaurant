<?php

namespace App\Http\Controllers;

use App\Services\ReservaService;
use Illuminate\Http\Request;

class ReservaController extends Controller
{
    public function crear(Request $request, ReservaService $reservaService)
    {
        $request->validate([
            'mesa_id'=>'required|integer',
            'usuario_id'=>'nullable|',
            'nombre_cliente' => 'required|string|max:255',
            'telefono_cliente' => 'required|string|max:255',
            'fecha' => 'required|date',
            'hora' => 'required',
            'cant_personas' => 'required|integer|min:1',
        ]);

        $reserva = $reservaService->crearReserva(
            $request->all()
        );

        return response()->json([
            'mensaje' => 'Reserva creada correctamente.',
            'reserva' => $reserva
        ], 201);
        
    }

    public function cancelar(int $id, ReservaService $reservaService)
    {
        //solo necesito el id de la reserva a cancelar en este caso
        $reserva = $reservaService->cancelarReserva($id);

        return response()->json([
            'mensaje' => 'Reserva cancelada correctamente',
            'reserva' => $reserva
        ], 200);
    }
}
