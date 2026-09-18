<?php

namespace App\Http\Controllers;

use App\Models\Ingrediente;
use Illuminate\Http\Request;
use App\Models\Producto;
use App\Services\ProductoService;
use Illuminate\Support\Facades\Validator;

class ProductoController extends Controller
{
    public function __construct(private ProductoService $service) {}

    public function index()
    {
        //Entonces le pido aparte del producto, la categoria a la que pertenece y aparte solo traemos las que estan disponibles
        $productos = $this->service->obtenerDisponibles();

        if ($productos->isEmpty()) {
            $data = [
                'message' => 'No se encontraron productos'
            ];
            return response()->json($data, 200);
        }

        return response()->json($productos, 200);
    }

    public function show($id)
    {
        $producto = $this->service->obtenerConIngredientes($id);

        if (!$producto) {
            $data = [
                'message' => 'No se encontraron productos'
            ];
            return response()->json($data, 200);
        }

        return response()->json($producto, 200);
    }

    public function store(Request $request)
    {

        $datos = $request->validate([
            'categoria_id' => 'required|exists:categorias,id',
            'nombre' => 'required|string|max:255',
            'descripcion' => 'nullable|string',
            'precio' => 'required|numeric|min:0',
            'imagen' => 'nullable|string|max:255',
            'disponible' => 'required|boolean',
            'ingredientes'   => 'nullable|array',
            'ingredientes.*' => 'exists:ingredientes,id',
        ]);

        $producto = $this->service->crear($datos);

        return response()->json([
            'message' => 'Producto creado exitosamente',
            'producto' => $producto
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $datos = $request->validate([
            'categoria_id' => 'required|exists:categorias,id',
            'nombre' => 'required|string|max:255',
            'descripcion' => 'nullable|string',
            'precio' => 'required|numeric|min:0',
            'imagen' => 'nullable|string|max:255',
            'disponible' => 'required|boolean',
            'ingredientes'   => 'nullable|array',
            'ingredientes.*' => 'exists:ingredientes,id',
        ]);

        $producto = $this->service->actualizar($id, $datos);

        return response()->json([
            'message' => 'Producto actualizado exitosamente',
            'producto' => $producto
        ], 200);
    }

    public function destroy($id)
    {
        $this->service->eliminar($id);

        return response()->json([
            'message' => 'Producto eliminado exitosamente'
        ], 200);
    }
}
