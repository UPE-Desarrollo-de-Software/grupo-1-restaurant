<?php

namespace App\Http\Controllers;

use App\UseCases\Categorias\ActualizarCategoriaUseCase;
use App\UseCases\Categorias\CrearCategoriaUseCase;
use App\UseCases\Categorias\EliminarCategoriaUseCase;
use App\UseCases\Categorias\ListarCategoriasUseCase;
use App\UseCases\Categorias\ObtenerCategoriaUseCase;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;

/**
 * Categorías de la carta. Una categoría con platos no se puede borrar
 * (FK platos.categoria_id sin cascade) → 422.
 */
class CategoriaController extends Controller
{
    public function __construct(
        private ListarCategoriasUseCase $listar,
        private ObtenerCategoriaUseCase $obtener,
        private CrearCategoriaUseCase $crear,
        private ActualizarCategoriaUseCase $actualizar,
        private EliminarCategoriaUseCase $eliminar,
    ) {}

    public function index()
    {
        return response()->json(($this->listar)());
    }

    public function show(int $id)
    {
        $categoria = ($this->obtener)($id);

        if (! $categoria) {
            return response()->json(['message' => 'No se encontraron categorias'], 200);
        }

        return response()->json($categoria, 200);
    }

    public function store(Request $request)
    {
        $datos = $request->validate([
            'nombre' => 'required|string|max:255',
            'descripcion' => 'nullable|string',
            'activo' => 'required|boolean',
        ]);

        $categoria = ($this->crear)($datos);

        return response()->json([
            'message' => 'Categoria creada exitosamente',
            'categoria' => $categoria,
        ], 201);
    }

    public function update(Request $request, int $id)
    {
        $datos = $request->validate([
            'nombre' => 'required|string|max:255',
            'descripcion' => 'nullable|string',
            'activo' => 'required|boolean',
        ]);

        $categoria = ($this->actualizar)($id, $datos);

        if (! $categoria) {
            return response()->json(['message' => 'No se encontraron categorias'], 200);
        }

        return response()->json([
            'message' => 'Categoria actualizada exitosamente',
            'categoria' => $categoria,
        ], 200);
    }

    public function destroy(int $id)
    {
        try {
            $eliminada = ($this->eliminar)($id);
        } catch (QueryException) {
            // FK platos.categoria_id sin cascade.
            return response()->json([
                'message' => 'No se puede eliminar: la categoria tiene platos asociados.',
            ], 422);
        }

        if (! $eliminada) {
            return response()->json(['message' => 'No se encontraron categorias'], 200);
        }

        return response()->json([
            'message' => 'Categoria eliminada exitosamente',
        ], 200);
    }
}
