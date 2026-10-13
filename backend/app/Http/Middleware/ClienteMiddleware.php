<?php

namespace App\Http\Middleware;

use App\Models\Cliente;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * MIDDLEWARE CONGELADO (fuera del DER v2.1): validaba tokens de
 * cliente de una sesión activa. Ya no se usa en ninguna ruta (el alias
 * 'cliente' sigue registrado en bootstrap/app.php por si el flujo
 * vuelve). Ver documentacion/DER-v2.1-backend.md.
 */
class ClienteMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $cliente = $request->user();

        if (! $cliente instanceof Cliente) {
            return response()->json([
                'message' => 'Solo los clientes pueden acceder.',
            ], 403);
        }

        // verificar si la sesion sigue activa
        if (! $cliente->sesion->estaActiva()) {
            return response()->json([
                'message' => 'Sesion expirada o cerrada.',
            ], 403);
        }

        return $next($request);
    }
}
