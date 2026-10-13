<?php

use App\Http\Middleware\ClienteMiddleware;
use App\Http\Middleware\TienePermiso;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {

        $middleware->redirectGuestsTo(function (Request $request) {
            return null;
        });

        $middleware->alias([
            // Autorización por permiso (DER v2.1, tabla ROL_PERMISO).
            // Uso: Route::middleware('permiso:tomar_pedidos').
            'permiso' => TienePermiso::class,

            // CONGELADO: el alias 'cliente' ya no se usa en ninguna ruta
            // (el DER v2.1 eliminó SESION/CLIENTES y el login por código
            // grupal quedó desconectado). Se conserva por si la
            // funcionalidad vuelve en otra entidad.
            'cliente' => ClienteMiddleware::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })->create();
