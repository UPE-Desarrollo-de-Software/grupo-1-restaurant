<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EsGerente
{
    public function handle(Request $request, Closure $next): Response
    {
        $usuario = $request->user();

        if (!$usuario || $usuario->rol->nombre !== 'Gerente') {
            return response()->json([
                'message' => 'No tenes permisos para realizar esta accion.'
            ], 403);
        }

        return $next($request);
    }
}
