<?php

namespace App\Http\Controllers;

use App\UseCases\Ingredientes\ActualizarIngredienteUseCase;
use App\UseCases\Ingredientes\CrearIngredienteUseCase;
use App\UseCases\Ingredientes\EliminarIngredienteUseCase;
use App\UseCases\Ingredientes\ListarIngredientesUseCase;
use App\UseCases\Ingredientes\ObtenerIngredienteUseCase;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\Request;

/**
 * Ingrediente (catálogo). Es el único recurso que responde 404 cuando
 * no existe (convención del repo).
 */
class IngredienteController extends Controller
{
    public function __construct(
        private ListarIngredientesUseCase $listar,
        private ObtenerIngredienteUseCase $obtener,
        private CrearIngredienteUseCase $crear,
        private ActualizarIngredienteUseCase $actualizar,
        private EliminarIngredienteUseCase $eliminar,
    ) {}

    public function index()
    {
        $ingredientes = ($this->listar)();

        if ($ingredientes->isEmpty()) {
            return response()->json(['message' => 'No se encontraron ingredientes'], 200);
        }

        return response()->json($ingredientes, 200);
    }

    public function show(int $id)
    {
        try {
            return response()->json(($this->obtener)($id), 200);
        } catch (ModelNotFoundException) {
            return response()->json(['message' => 'Ingrediente no encontrado'], 404);
        }
    }

    public function store(Request $request)
    {
        // Sin `opcional`: ese flag vive en plato_ingrediente (DER). Acá
        // solo queda el recargo de catálogo.
        $datos = $request->validate([
            'nombre' => 'required|string|max:255',
            'precioAdicional' => 'required|numeric|min:0',
        ]);

        $ingrediente = ($this->crear)($datos);

        return response()->json([
            'message' => 'Ingrediente creado exitosamente',
            'ingrediente' => $ingrediente,
        ], 201);
    }

    public function update(Request $request, int $id)
    {
        $datos = $request->validate([
            'nombre' => 'required|string|max:255',
            'precioAdicional' => 'required|numeric|min:0',
        ]);

        try {
            $ingrediente = ($this->actualizar)($id, $datos);
        } catch (ModelNotFoundException) {
            return response()->json(['message' => 'Ingrediente no encontrado'], 404);
        }

        return response()->json([
            'message' => 'Ingrediente actualizado exitosamente',
            'ingrediente' => $ingrediente,
        ], 200);
    }

    public function destroy(int $id)
    {
        try {
            ($this->eliminar)($id);
        } catch (ModelNotFoundException) {
            return response()->json(['message' => 'Ingrediente no encontrado'], 404);
        }

        return response()->json([
            'message' => 'Ingrediente eliminado exitosamente',
        ], 200);
    }
}
