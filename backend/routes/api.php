<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\CategoriaController;
use App\Http\Controllers\IngredienteController;
use App\Http\Controllers\ProductoController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\UsuarioController;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

//con esta ruta traemos las categorias que despues se muestran en el front
Route::get('/categorias', [CategoriaController::class, 'index']);

Route::get('/categorias/{id}', [CategoriaController::class, 'show']);

Route::post('/categorias', [CategoriaController::class, 'store']);

Route::put('/categorias/{id}', [CategoriaController::class, 'update']);

Route::delete('/categorias/{id}', [CategoriaController::class, 'destroy']);

// PRODUCTOS
//con esta traemos los productos
Route::get('/productos', [ProductoController::class, 'index']);


//con esta producto por id para mostrar uno en especifico
Route::get('/productos/{id}', [ProductoController::class, 'show']);

Route::post('/productos', [ProductoController::class, 'store']);

Route::put('/productos/{id}', [ProductoController::class, 'update']);

Route::delete('/productos/{id}', [ProductoController::class, 'destroy']);

// INGREDIENTES

Route::get('/ingredientes', [IngredienteController::class, 'index']);

Route::get('/ingredientes/{id}', [IngredienteController::class, 'show']);

Route::post('/ingredientes', [IngredienteController::class, 'store']);

Route::put('/ingredientes/{id}', [IngredienteController::class, 'update']);

Route::delete('/ingredientes/{id}', [IngredienteController::class, 'destroy']);

// USUARIO

Route::post('/login', [AuthController::class, 'login']);



// RUTAS PROTEGIDAS POR TOKEN
Route::middleware('auth:sanctum', 'gerente')->group(function () {

    // aca agregar todas la funciones que requieran inicio de sesion y rol de gerente
    Route::post('/usuarios', [UsuarioController::class, 'register']);
});

Route::middleware('auth:sanctum')->group(function () {
    // aca agregar todas la funciones que requieran inicio de sesion
    Route::post('/logout', [AuthController::class, 'logout']);
});
