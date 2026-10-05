<?php

namespace App\Http\Middleware;

use App\Models\Cliente;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

// el mozo no tiene permiso ya que debera tener sus propias funciones para tomar pedidos

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
