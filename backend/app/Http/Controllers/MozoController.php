<?php

namespace App\Http\Controllers;

use App\Services\SesionService;
use Illuminate\Http\Request;
use App\Models\Mesa;
use app\Models\Sesion;

class MozoController extends Controller
{
    public function __construct(private SesionService $sesionService) {}

    public function crearSesion(Request $request, Mesa $mesa)
    {
        $request->validate([
            'mesasIds' => 'nullable|array|min:1',
            'mesasIds.*' => 'integer|exists:mesas,id',
        ]);

        $mozo = $request->user(); // Obtener el mozo autenticado


        $mesasIds = $request->get('mesasIds', [$mesa->id]); // Obtener las mesas seleccionadas, si no se proporcionan, usar la mesa actual


        $sesion = $this->sesionService->crearSesion($mozo, $mesasIds);


        return response()->json([
            'message' => 'Sesión creada exitosamente',
            'sesion' => [
                'id' => $sesion->id,
                'codigoGrupal' => $sesion->codigoGrupal,
                'mesas' => $sesion->mesas()->select('mesas.id')->get(),
            ]
        ], 201);
    }

    public function cerrarSesion(Request $request, Sesion $sesion)
    {
        $mozo = $request->user(); // Obtener el mozo autenticado

        // Verificar que la sesión pertenece al mozo
        if ($sesion->mozoID !== $mozo->id) {
            return response()->json(['message' => 'No autorizado para cerrar esta sesión'], 403);
        }

        $this->sesionService->cerrarSesion($sesion);

        return response()->json([
            'message' => 'Sesión cerrada exitosamente'
        ]);
    }

    public function verDetalles(Request $request, Sesion $sesion)
    {
        $clientesActivos = $this->sesionService->obtenerClientesActivos($sesion);
        $detalles = $this->sesionService->obtenerDetalles($sesion);
        return response()->json([
            'sesion' => [
                'detalles' => $detalles->original['sesion'],
                'clientesActivos' => $clientesActivos,
            ]
        ]);
    }
}
