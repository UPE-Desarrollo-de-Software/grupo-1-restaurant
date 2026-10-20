<?php

namespace App\Http\Controllers;

use App\UseCases\Reportes\ListarHistorialComandasUseCase;
use App\UseCases\Reportes\ObtenerComandaUseCase;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\Request;

/**
 * HISTORIAL DE COMANDAS (módulo Reportes): la comanda = PEDIDO con
 * sus líneas y su mesa (aunque la mesa haya sido destruida). Permiso
 * `ver_historial_comandas` (Gerente y Cocina).
 *
 * Sin filtro `estado` se listan solo los finalizados (cerrado /
 * cancelado). "No encontrado" responde 404 (como ReservaController).
 */
class HistorialComandaController extends Controller
{
    public function __construct(
        private ListarHistorialComandasUseCase $listar,
        private ObtenerComandaUseCase $obtener,
    ) {}

    /**
     * GET /api/historial/comandas?desde=&hasta=&estado=&mesa_id=&page=&per_page=
     * Paginador de Laravel directo (current_page, data, total…).
     */
    public function index(Request $request)
    {
        $datos = $request->validate([
            'desde' => 'sometimes|nullable|date_format:Y-m-d',
            'hasta' => 'sometimes|nullable|date_format:Y-m-d',
            'estado' => 'sometimes|nullable|in:en_curso,confirmado,enviado,en_preparacion,entregado,cerrado,cancelado',
            'mesa_id' => 'sometimes|nullable|integer',
            'page' => 'sometimes|integer|min:1',
            'per_page' => 'sometimes|integer|min:1|max:100',
        ]);

        return response()->json(($this->listar)($datos), 200);
    }

    /**
     * GET /api/historial/comandas/{id} (extravíos). 404 si no existe.
     */
    public function show(int $id)
    {
        try {
            return response()->json(($this->obtener)($id), 200);
        } catch (ModelNotFoundException) {
            return response()->json(['message' => 'Comanda no encontrada'], 404);
        }
    }
}
