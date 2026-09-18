<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Categoria;
use App\Services\CategoriaService;


class CategoriaController extends Controller
{
    public function __construct(private CategoriaService $service) {}

    public function index()
    {
        //ler pido a laravel que busque todas las categorias activas
        $categorias = Categoria::where('activo', true)->get();

        //yyy retorno la respuesta en json para que la reciban en react
        return response()->json($categorias);
    }

    public function show()
    {
        $categorias = $this->service->obtenerTodos();

        if ($categorias->isEmpty()) {
            $data = [
                'message' => 'No se encontraron categorias'
            ];
            return response()->json($data, 200);
        }

        return response()->json($categorias, 200);
    }

    public function store(Request $request)
    {
        $datos = $request->validate([
            'nombre' => 'required|string|max:255',
            'descripcion' => 'nullable|string',
            'activo' => 'required|boolean',
        ]);

        $categoria = $this->service->crear($datos);

        return response()->json([
            'message' => 'Categoria creada exitosamente',
            'categoria' => $categoria
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $datos = $request->validate([
            'nombre' => 'required|string|max:255',
            'descripcion' => 'nullable|string',
            'activo' => 'required|boolean',
        ]);

        $categoria = $this->service->actualizar($id, $datos);

        return response()->json([
            'message' => 'Categoria actualizada exitosamente',
            'categoria' => $categoria
        ], 200);
    }

    public function destroy($id)
    {
        $this->service->eliminar($id);

        return response()->json([
            'message' => 'Categoria eliminada exitosamente'
        ], 200);
    }
}
