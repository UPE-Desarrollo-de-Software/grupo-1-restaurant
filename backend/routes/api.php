<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CategoriaController;
use App\Http\Controllers\IngredienteController;
use App\Http\Controllers\MesaController;
use App\Http\Controllers\PedidoController;
use App\Http\Controllers\PlatoController;
use App\Http\Controllers\RolController;
use App\Http\Controllers\UsuarioController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API — alineada al DER v2.1
|--------------------------------------------------------------------------
| Modelo activo: USUARIO (con permisos ROL_PERMISO), MESA (mozo
| responsable), PEDIDO cuelga de MESA, PLATO, INGREDIENTE con flags en
| PLATO_INGREDIENTE, PROMOCION (catálogo vía platos.promocion_id) y
| RESERVA.
|
| El flujo de SESION / CLIENTES (login por código grupal) quedó
| DESCONECTADO: sus rutas no existen más y el código quedó congelado
| (SesionController, MozoController, SesionService, ClienteMiddleware).
| Ver documentacion/DER-v2.1-backend.md.
|
| La autorización usa el middleware con parámetro `permiso:` (tabla
| ROL_PERMISO), que reemplazó a los viejos aliases gerente/mozo.
*/

// ==================== PÚBLICOS ====================

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

// CARTA

Route::get('/categorias', [CategoriaController::class, 'index']);

Route::get('/categorias/{id}', [CategoriaController::class, 'show']);

Route::get('/platos', [PlatoController::class, 'index']);

// plato por id para mostrar uno en específico (con sus ingredientes)
Route::get('/platos/{id}', [PlatoController::class, 'show']);

Route::get('/ingredientes', [IngredienteController::class, 'index']);

Route::get('/ingredientes/{id}', [IngredienteController::class, 'show']);

Route::post('/login', [AuthController::class, 'login']);

// ==================== CUALQUIER EMPLEADO AUTENTICADO ====================

Route::middleware('auth:sanctum')->group(function () {

    Route::post('/logout', [AuthController::class, 'logout']);

    // Mesas: cualquier empleado puede verlas (el mozo las necesita para
    // tomar pedidos); el CRUD es del gerente (permiso gestionar_mesas).
    Route::get('/mesas', [MesaController::class, 'index']);
    Route::get('/mesas/disponibles', [MesaController::class, 'disponibles']);
    Route::get('/mesas/{mesa}', [MesaController::class, 'show']);
});

// ==================== TOMA DE PEDIDOS (mozo / gerente) ====================
// Permiso tomar_pedidos: Mozo y Gerente (ver RolSeeder).

Route::middleware(['auth:sanctum', 'permiso:tomar_pedidos'])->group(function () {

    // Pedido no finalizado de una mesa.
    Route::get('/mesas/{mesa}/pedido-activo', [PedidoController::class, 'pedidoActivo']);

    // Agrega líneas al pedido en curso de la mesa (lo crea si no existe).
    // Regla del DER: a lo sumo 1 pedido no-finalizado por mesa.
    Route::post('/mesas/{mesa}/pedidos', [PedidoController::class, 'agregarProducto']);

    // Envia el pedido a cocina (estado "enviado").
    Route::post('/pedidos/{pedido}/enviar', [PedidoController::class, 'enviarPedido']);

    // Avanza el flujo del DER o cancela; los estados finales liberan la mesa.
    Route::put('/pedidos/{pedido}/estado', [PedidoController::class, 'cambiarEstado']);
});

// ==================== GESTIÓN (permisos por módulo) ====================

// USUARIOS

Route::middleware(['auth:sanctum', 'permiso:gestionar_usuarios'])->group(function () {

    Route::post('/usuarios/registrar', [UsuarioController::class, 'register']);
    Route::get('/usuarios', [UsuarioController::class, 'index']);
    Route::get('/usuarios/{id}', [UsuarioController::class, 'show'])->whereNumber('id');
    Route::put('/usuarios/{id}', [UsuarioController::class, 'update'])->whereNumber('id');
    Route::delete('/usuarios/{id}', [UsuarioController::class, 'destroy'])->whereNumber('id');
    Route::post('/usuarios/{id}/reactivar', [UsuarioController::class, 'reactivar'])->whereNumber('id');
});

// ROLES

Route::middleware(['auth:sanctum', 'permiso:gestionar_roles'])->group(function () {

    // para mostrar los roles en el front al crear/editar usuarios
    Route::get('/roles', [RolController::class, 'index']);
});

// CARTA: categorías y platos

Route::middleware(['auth:sanctum', 'permiso:gestionar_categorias'])->group(function () {

    Route::post('/categorias', [CategoriaController::class, 'store']);
    Route::put('/categorias/{id}', [CategoriaController::class, 'update']);
    Route::delete('/categorias/{id}', [CategoriaController::class, 'destroy']);
});

Route::middleware(['auth:sanctum', 'permiso:gestionar_platos'])->group(function () {

    Route::post('/platos', [PlatoController::class, 'store']);
    Route::put('/platos/{id}', [PlatoController::class, 'update']);
    Route::delete('/platos/{id}', [PlatoController::class, 'destroy']);
});

// INGREDIENTES

Route::middleware(['auth:sanctum', 'permiso:gestionar_ingredientes'])->group(function () {

    Route::post('/ingredientes', [IngredienteController::class, 'store']);
    Route::put('/ingredientes/{id}', [IngredienteController::class, 'update']);
    Route::delete('/ingredientes/{id}', [IngredienteController::class, 'destroy']);
});

// MESAS: alta, edición y baja (el listado es público para empleados arriba)

Route::middleware(['auth:sanctum', 'permiso:gestionar_mesas'])->group(function () {

    Route::post('/mesas', [MesaController::class, 'store']);
    Route::put('/mesas/{mesa}', [MesaController::class, 'update']);
    Route::delete('/mesas/{mesa}', [MesaController::class, 'destroy']);
});
