<?php

namespace App\Http\Controllers;

use App\Services\PlatoService;
use Illuminate\Http\Request;

/**
 * Endpoints de PLATO (DER v2.1). Antes se llamaban "productos"
 * (controlador ProductoController, rutas /api/productos).
 */
class PlatoController extends Controller
{
    public function __construct(private PlatoService $service) {}

    public function index()
    {
        // Pido aparte del plato su categoría, y solo los disponibles.
        $platos = $this->service->obtenerDisponibles();

        if ($platos->isEmpty()) {
            $data = [
                'message' => 'No se encontraron platos',
            ];

            return response()->json($data, 200);
        }

        return response()->json($platos, 200);
    }

    public function show(int $id)
    {
        $plato = $this->service->obtenerConIngredientes($id);

        if (! $plato) {
            $data = [
                'message' => 'No se encontraron platos',
            ];

            return response()->json($data, 200);
        }

        return response()->json($plato, 200);
    }

    public function store(Request $request)
    {
        $datos = $request->validate([
            'categoria_id' => 'required|exists:categorias,id',
            // Oferta vigente en la carta (FK opcional del DER).
            'promocion_id' => 'nullable|exists:promociones,id',
            'nombre' => 'required|string|max:255',
            'descripcion' => 'nullable|string',
            'precio' => 'required|numeric|min:0',
            'imagen' => 'nullable|string|max:255',
            'disponible' => 'required|boolean',

            // Ingredientes del plato con los flags opcional/por_defecto.
            'ingredientes' => 'nullable|array',
            'ingredientes.*' => 'array',
            'ingredientes.*.ingrediente_id' => 'required|integer|exists:ingredientes,id',
            'ingredientes.*.opcional' => 'nullable|boolean',
            'ingredientes.*.por_defecto' => 'nullable|boolean',
        ]);

        $plato = $this->service->crear($datos);

        return response()->json([
            'message' => 'Plato creado exitosamente',
            'plato' => $plato,
        ], 201);
    }

    public function update(Request $request, int $id)
    {
        $datos = $request->validate([
            'categoria_id' => 'required|exists:categorias,id',
            'promocion_id' => 'nullable|exists:promociones,id',
            'nombre' => 'required|string|max:255',
            'descripcion' => 'nullable|string',
            'precio' => 'required|numeric|min:0',
            'imagen' => 'nullable|string|max:255',
            'disponible' => 'required|boolean',
            'ingredientes' => 'nullable|array',
            'ingredientes.*' => 'array',
            'ingredientes.*.ingrediente_id' => 'required|integer|exists:ingredientes,id',
            'ingredientes.*.opcional' => 'nullable|boolean',
            'ingredientes.*.por_defecto' => 'nullable|boolean',
        ]);

        $plato = $this->service->actualizar($id, $datos);

        return response()->json([
            'message' => 'Plato actualizado exitosamente',
            'plato' => $plato,
        ], 200);
    }

    public function destroy(int $id)
    {
        $this->service->eliminar($id);

        return response()->json([
            'message' => 'Plato eliminado exitosamente',
        ], 200);
    }
}
