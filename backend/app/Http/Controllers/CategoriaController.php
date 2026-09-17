<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Categoria;

class CategoriaController extends Controller
{
    public function index()
    {
        //ler pido a laravel que busque todas las categorias activas
        $categorias = Categoria::where('activo', true)->get();

        //yyy retorno la respuesta en json para que la reciban en react
        return response()->json($categorias);
    }
}
