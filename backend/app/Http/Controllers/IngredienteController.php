<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\IngredienteService;

class IngredienteController extends Controller
{

    public function __construct(private IngredienteService $service) {}

    public function index()
    {

        $ingredientes = $this->service->obtenerTodos();

        if ($ingredientes->isEmpty()) {
            $data = [
                'message' => 'No se encontraron ingredientes'
            ];
            return response()->json($data, 200);
        }

        return response()->json($ingredientes, 200);
    }

    public function show($id)
    {
        $ingrediente = $this->service->obtenerPorId($id);

        if (!$ingrediente) {
            $data = [
                'message' => 'Ingrediente no encontrado'
            ];
            return response()->json($data, 404);
        }

        return response()->json($ingrediente, 200);
    }

    public function store(Request $request)
    {
        $datos = $request->validate([
            'nombre' => 'required|string|max:255',
            'opcional' => 'required|boolean',
            'precioAdicional' => 'required|numeric|min:0',
        ]);

        $ingrediente = $this->service->crear($datos);

        return response()->json([
            'message' => 'Ingrediente creado exitosamente',
            'ingrediente' => $ingrediente
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $datos = $request->validate([
            'nombre' => 'required|string|max:255',
            'opcional' => 'required|boolean',
            'precioAdicional' => 'required|numeric|min:0',
        ]);

        $ingrediente = $this->service->actualizar($id, $datos);

        return response()->json([
            'message' => 'Ingrediente actualizado exitosamente',
            'ingrediente' => $ingrediente
        ], 200);
    }

    public function destroy($id)
    {
        $this->service->eliminar($id);

        return response()->json([
            'message' => 'Ingrediente eliminado exitosamente'
        ], 200);
    }
}
