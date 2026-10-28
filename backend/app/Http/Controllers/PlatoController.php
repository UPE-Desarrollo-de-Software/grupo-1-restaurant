<?php

namespace App\Http\Controllers;

use App\UseCases\Platos\ActualizarPlatoUseCase;
use App\UseCases\Platos\CrearPlatoUseCase;
use App\UseCases\Platos\EliminarPlatoUseCase;
use App\UseCases\Platos\ListarPlatosActivosUseCase;
use App\UseCases\Platos\ListarPlatosUseCase;
use App\UseCases\Platos\ObtenerPlatoUseCase;
use Illuminate\Http\Request;

/**
 * PLATO (antes "productos", rutas /api/productos).
 */
class PlatoController extends Controller
{
    public function __construct(
        private ListarPlatosUseCase $listar,
        private ListarPlatosActivosUseCase $listarActivos,
        private ObtenerPlatoUseCase $obtener,
        private CrearPlatoUseCase $crear,
        private ActualizarPlatoUseCase $actualizar,
        private EliminarPlatoUseCase $eliminar,
    ) {}

    public function indexAll()
    {
        $platos = ($this->listar)();

        if ($platos->isEmpty()) {
            return response()->json(['message' => 'No se encontraron platos'], 200);
        }

        return response()->json($platos, 200);
    }

    public function index()
    {
        $platos = ($this->listarActivos)();

        if ($platos->isEmpty()) {
            return response()->json(['message' => 'No se encontraron platos'], 200);
        }

        return response()->json($platos, 200);
    }

    public function show(int $id)
    {
        $plato = ($this->obtener)($id);

        if (! $plato) {
            return response()->json(['message' => 'No se encontraron platos'], 200);
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

        $plato = ($this->crear)($datos);

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

        $plato = ($this->actualizar)($id, $datos);

        if (! $plato) {
            return response()->json(['message' => 'No se encontraron platos'], 200);
        }

        return response()->json([
            'message' => 'Plato actualizado exitosamente',
            'plato' => $plato,
        ], 200);
    }

    public function destroy(int $id)
    {
        $eliminado = ($this->eliminar)($id);

        if (! $eliminado) {
            return response()->json(['message' => 'No se encontraron platos'], 200);
        }

        return response()->json([
            'message' => 'Plato eliminado exitosamente',
        ], 200);
    }
}
