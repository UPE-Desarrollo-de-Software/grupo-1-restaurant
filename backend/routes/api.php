<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CategoriaController;
use App\Http\Controllers\ClienteController;
use App\Http\Controllers\ConfiguracionController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\HistorialComandaController;
use App\Http\Controllers\IngredienteController;
use App\Http\Controllers\MesaController;
use App\Http\Controllers\PedidoController;
use App\Http\Controllers\PlatoController;
use App\Http\Controllers\PromocionController;
use App\Http\Controllers\ReservaController;
use App\Http\Controllers\RolController;
use App\Http\Controllers\UsuarioController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API — alineada al DER v2.2
|--------------------------------------------------------------------------
| Modelo activo: USUARIO (con permisos ROL_PERMISO), MESA dinámica con
| aforo (PARAMETRO) y borrado lógico, PEDIDO con relación unitaria
| PEDIDO–PEDIDO (pedido_padre_id) y VARIOS pedidos activos por mesa,
| PLATO, INGREDIENTE con flags en PLATO_INGREDIENTE, PROMOCION y
| RESERVA. El auto-pedido NO usa la entidad CLIENTE (borrada): el
| comensal entra con el codigo_acceso de su mesa (POST /api/acceso) y
| lo manda como Bearer en /cliente/*. Su identidad en la visita es el
| pedido que creó (localStorage del front).
|
| La autorización usa el middleware con parámetro `permiso:` (tabla
| ROL_PERMISO). Arquitectura hexagonal: Controller → UseCase →
| Service → Repository.
*/

// ==================== PÚBLICOS ====================

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

// CARTA

Route::get('/categorias/activas', [CategoriaController::class, 'index']);

Route::get('/categorias', [CategoriaController::class, 'indexAll']);

Route::get('/categorias/{id}', [CategoriaController::class, 'show']);

Route::get('/platos', [PlatoController::class, 'index']);

// plato por id para mostrar uno en específico (con sus ingredientes).
// whereNumber: si no, /platos/todos (abajo) matchea /platos/{id}
// con id="todos" y show(int) revienta con TypeError.
Route::get('/platos/{id}', [PlatoController::class, 'show'])->whereNumber('id');

Route::get('/ingredientes', [IngredienteController::class, 'index']);

Route::get('/ingredientes/{id}', [IngredienteController::class, 'show']);

Route::post('/login', [AuthController::class, 'login']);

// ACCESO DEL COMENSAL (auto-pedido): público y con throttle. Body:
// { codigo } → devuelve la mesa; el front guarda el código y lo manda
// como Authorization: Bearer <codigo> en /cliente/*. No hay token.
Route::post('/acceso', [ClienteController::class, 'acceder'])
    ->middleware('throttle:60,1');

// ==================== COMENSAL (auto-pedido) ====================
// Sin auth:sanctum: el middleware 'cliente' resuelve la mesa desde el
// Bearer codigo_acceso (401 si falta o si la mesa fue destruida).

Route::middleware(['cliente', 'throttle:60,1'])->prefix('cliente')->group(function () {

    // Resumen de lectura: todos los pedidos activos de la mesa.
    Route::get('/pedidos', [ClienteController::class, 'pedidos']);

    // Agrega SUS líneas: crea su pedido raíz, sigue uno en curso
    // (pedido_id) o crea un hijo (pedido_padre_id).
    Route::post('/pedidos', [ClienteController::class, 'agregar']);

    // Confirma / desconfirma las líneas de SU pedido (gate de fila).
    Route::post('/pedidos/confirmar', [ClienteController::class, 'confirmar']);
    Route::post('/pedidos/desconfirmar', [ClienteController::class, 'desconfirmar']);

    // Cuenta dividida en partes por pedido raíz.
    Route::get('/cuenta', [ClienteController::class, 'cuenta']);
});

// RESERVAS DEL CLIENTE WEB (públicas con throttle):
//  - alta: pide personas + horario y el sistema asigna la combinación
//    de capacidades del inventario (CONFIG_MESA − pendientes
//    solapadas); no hay mesa que elegir ni "mozo virtual";
//  - disponibilidad: qué capacidades quedan libres para ese intervalo
//    (reemplaza al antiguo mapa de elección de mesas).
Route::post('/cliente/reservas', [ReservaController::class, 'solicitarWeb'])
    ->middleware('throttle:60,1');

Route::get('/cliente/reservas/disponibilidad', [ReservaController::class, 'disponibilidad'])
    ->middleware('throttle:60,1');

// ==================== CUALQUIER EMPLEADO AUTENTICADO ====================

Route::middleware('auth:sanctum')->group(function () {

    Route::post('/logout', [AuthController::class, 'logout']);

    // Mesas: cualquier empleado puede verlas (el mozo las necesita para
    // tomar pedidos); el CRUD es del gerente (permiso gestionar_mesas).
    Route::get('/mesas', [MesaController::class, 'index']);
    Route::get('/mesas/disponibles', [MesaController::class, 'disponibles']);
    Route::get('/mesas/{mesa}', [MesaController::class, 'show']);

    // Aforo del lugar y composición CONFIG_MESA.
    Route::get('/configuracion', [ConfiguracionController::class, 'show']);
});

// ==================== TOMA DE PEDIDOS (mozo / gerente) ====================
// Permiso tomar_pedidos: Mozo y Gerente (ver RolSeeder).

Route::middleware(['auth:sanctum', 'permiso:tomar_pedidos'])->group(function () {

    // Pedidos no finalizados de la mesa (varios comensales, varios
    // pedidos): { pedidos: [...] }.
    Route::get('/mesas/{mesa}/pedido-activo', [PedidoController::class, 'pedidoActivo']);

    // Alta de líneas del mozo. Sin pedido_id crea una raíz nueva (la
    // orden nueva de esa persona); con pedido_id agrega a uno en curso.
    Route::post('/mesas/{mesa}/pedidos', [PedidoController::class, 'agregarProducto']);

    // Resumen de lectura y cuenta de la mesa (también los ve el
    // comensal con los mismos datos bajo /cliente).
    Route::get('/mesas/{mesa}/pedidos', [MesaController::class, 'resumen']);
    Route::get('/mesas/{mesa}/cuenta', [MesaController::class, 'cuenta']);

    // Ocupa la mesa. NO regenera el código: es estable hasta destruirla.
    Route::post('/mesas/{mesa}/ocupar', [MesaController::class, 'ocupar']);

    // Fin de la VISITA: el cliente PAGÓ la cuenta y el mozo cierra la
    // mesa (borrado lógico). Exige cero pedidos activos (422 si quedan).
    Route::post('/mesas/{mesa}/cerrar', [MesaController::class, 'cerrar']);

    // Agrupación de lectura de varias mesas (no fusiona pedidos; los
    // códigos tampoco cambian).
    Route::post('/mesas/agrupar', [MesaController::class, 'agrupar']);
    Route::post('/mesas/desagrupar', [MesaController::class, 'desagrupar']);

    // Envío en 2 pasos: confirmar (gate de que ninguna línea siga sin
    // confirmar) y recién después enviar a cocina.
    Route::post('/pedidos/{pedido}/confirmar', [PedidoController::class, 'confirmar']);
    Route::post('/pedidos/{pedido}/enviar', [PedidoController::class, 'enviarPedido']);

    // Avanza el flujo del DER o cancela. NO toca la mesa: la visita
    // termina cuando el mozo la cierra tras el pago.
    Route::put('/pedidos/{pedido}/estado', [PedidoController::class, 'cambiarEstado']);

    // Alta de mesas dinámicas: las crea el mozo cuando hace falta
    // (aforo contra CONFIG_MESA; 422 si se supera).
    Route::post('/mesas', [MesaController::class, 'store']);
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

// RESERVAS (ABM completo, permiso gestionar_reservas: Mozo y Gerente)

Route::middleware(['auth:sanctum', 'permiso:gestionar_reservas'])->group(function () {

    // Alta desde el restaurante: la mesa es obligatoria (find estricto).
    Route::post('/reservas', [ReservaController::class, 'store']);

    // Agenda con filtros opcionales: ?estado=&fecha=&mesa_id=
    Route::get('/reservas', [ReservaController::class, 'index']);
    Route::get('/reservas/{id}', [ReservaController::class, 'show'])->whereNumber('id');

    // Transiciones desde 'pendiente'.
    Route::patch('/reservas/{id}/cancelar', [ReservaController::class, 'cancelar'])->whereNumber('id');
    Route::patch('/reservas/{id}/finalizar', [ReservaController::class, 'finalizar'])->whereNumber('id');
    Route::patch('/reservas/{id}/inasistio', [ReservaController::class, 'inasistio'])->whereNumber('id');
});

// nuevo, ruta para traer todos los roles de la base de datos, para despues mostrarlos en el front
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

    Route::get('/platos/todos', [PlatoController::class, 'indexAll']);
    Route::post('/platos', [PlatoController::class, 'store']);
    Route::put('/platos/{id}', [PlatoController::class, 'update'])->whereNumber('id');
    Route::delete('/platos/{id}', [PlatoController::class, 'destroy'])->whereNumber('id');
});

// INGREDIENTES

Route::middleware(['auth:sanctum', 'permiso:gestionar_ingredientes'])->group(function () {

    Route::post('/ingredientes', [IngredienteController::class, 'store']);
    Route::put('/ingredientes/{id}', [IngredienteController::class, 'update']);
    Route::delete('/ingredientes/{id}', [IngredienteController::class, 'destroy']);
});

// MESAS: edición y baja (el alta es del mozo, arriba). La baja es un
// borrado lógico: los pedidos históricos conservan su FK.

Route::middleware(['auth:sanctum', 'permiso:gestionar_mesas'])->group(function () {

    Route::put('/mesas/{mesa}', [MesaController::class, 'update']);
    Route::delete('/mesas/{mesa}', [MesaController::class, 'destroy']);

    // Aforo del lugar y composición CONFIG_MESA (replace-all).
    Route::put('/configuracion', [ConfiguracionController::class, 'update']);
});

Route::middleware(['auth:sanctum', 'permiso:gestionar_promociones'])->group(function () {
    Route::get('/promociones', [PromocionController::class, 'index']);
    Route::get('/promociones/{id}', [PromocionController::class, 'show'])->whereNumber('id');
    Route::post('/promociones', [PromocionController::class, 'store']);
    Route::put('/promociones/{id}', [PromocionController::class, 'update'])->whereNumber('id');
    Route::delete('/promociones/{id}', [PromocionController::class, 'destroy'])->whereNumber('id');
});

// ==================== REPORTES ====================

// Dashboard de estadísticas (solo Gerente).
Route::middleware(['auth:sanctum', 'permiso:ver_dashboard'])->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index']);
});

// Historial de comandas (= pedidos): Gerente y Cocina.
Route::middleware(['auth:sanctum', 'permiso:ver_historial_comandas'])->group(function () {
    Route::get('/historial/comandas', [HistorialComandaController::class, 'index']);
    Route::get('/historial/comandas/{id}', [HistorialComandaController::class, 'show'])->whereNumber('id');
});
