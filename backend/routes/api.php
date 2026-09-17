<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\CategoriaController;
use App\Http\Controllers\ProductoController;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

//con esta ruta traemos las categorias que despues se muestran en el front
Route::get('/categorias', [CategoriaController::class, 'index']);

//con esta traemos los productos
Route::get('/productos', [ProductoController::class, 'index']);

//con esta producto por id para mostrar uno en especifico
Route::get('/productos/{id}', [ProductoController::class, 'show']);