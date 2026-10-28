<?php

use App\Exceptions\ApiException;
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
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {

        $middleware->redirectGuestsTo(function (Request $request) {
            return null;
        });

        $middleware->alias([
            // Autorización por permiso (DER: tabla ROL_PERMISO).
            // Uso: Route::middleware('permiso:tomar_pedidos').
            'permiso' => TienePermiso::class,

            // Acceso del comensal (rebote 2): resuelve la mesa desde
            // Authorization: Bearer {codigo_acceso}. Uso: Route::
            // middleware('cliente') en el grupo /cliente (sin sanctum).
            'cliente' => ClienteMiddleware::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        // Los UseCases/Services lanzan ApiException con su estado HTTP
        // (p.ej. credenciales inválidas 401, última gerente 403): acá
        // se convierte en la respuesta JSON {message}.
        $exceptions->render(function (ApiException $e, Request $request) {
            return response()->json(['message' => $e->getMessage()], $e->status);
        });
    })->create();
