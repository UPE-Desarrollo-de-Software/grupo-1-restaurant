<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Producto;

class ProductoController extends Controller
{
    public function index()
    {
        //Entonces le pido aparte del producto, la categoria a la que pertenece y aparte solo traemos las que estan disponibles
        $productos = Producto::with('categoria')
            ->where('disponible', true)
            ->get();

            return response()->json($productos);
    }

    public function show($id)
    {
        $producto = Producto::with('categoria')->findOrFail($id);

        return response()->json($producto);
    }
}
