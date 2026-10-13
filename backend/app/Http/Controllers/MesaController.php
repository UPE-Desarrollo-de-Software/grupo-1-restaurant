<?php

namespace App\Http\Controllers;

use App\Services\MesaService;
use Illuminate\Http\Request;

/**
 * CRUD de MESAS (DER v2.1).
 *
 * La mesa pasó a ser la unidad central del modelo: los pedidos cuelgan
 * de `pedidos.mesa_id` y el estado de la mesa se sincroniza con ellos
 * (libre ↔ ocupada, ver PedidoService).
 */
class MesaController extends Controller
{
    public function __construct(private MesaService $service) {}

    /**
     * Listado de todas las mesas.
     */
    public function index()
    {
        $mesas = $this->service->obtenerMesas();

        if ($mesas->isEmpty()) {
            return response()->json([
                'message' => 'No se encontraron mesas',
            ], 200);
        }

        return response()->json($mesas, 200);
    }

    /**
     * Listado de mesas libres (para asignar/comenzar servicio).
     */
    public function disponibles()
    {
        return response()->json($this->service->obtenerDisponibles(), 200);
    }

    /**
     * Crear una mesa. `estado` arranca en 'libre' salvo que se pida
     * otro (valores del DER: libre | ocupada | reservada).
     */
    public function store(Request $request)
    {
        $datos = $request->validate([
            'codigo_mesa' => 'required|integer',
            'capacidad' => 'required|integer|min:1',
            'estado' => 'nullable|in:libre,ocupada,reservada',
            'qr' => 'nullable|string',
            // Mozo responsable de la mesa (DER: USUARIO "atiende" MESA).
            'usuario_id' => 'nullable|exists:usuarios,id',
        ]);

        $mesa = $this->service->crearMesa($datos);

        return response()->json([
            'message' => 'Mesa creada exitosamente',
            'mesa' => $mesa,
        ], 201);
    }

    public function show(string $id)
    {
        $mesa = $this->service->obtenerPorId($id);

        if (! $mesa) {
            return response()->json(['message' => 'Mesa no encontrada'], 200);
        }

        return response()->json($mesa, 200);
    }

    public function update(Request $request, string $id)
    {
        $datos = $request->validate([
            'codigo_mesa' => 'required|integer',
            'capacidad' => 'required|integer|min:1',
            'estado' => 'required|in:libre,ocupada,reservada',
            'qr' => 'nullable|string',
            'usuario_id' => 'nullable|exists:usuarios,id',
        ]);

        $mesa = $this->service->actualizar($id, $datos);

        return response()->json([
            'message' => 'Mesa actualizada correctamente',
            'mesa' => $mesa,
        ], 200);
    }

    public function destroy(string $id)
    {
        $this->service->eliminar($id);

        return response()->json([
            'message' => 'Mesa eliminada exitosamente',
        ], 200);
    }
}
