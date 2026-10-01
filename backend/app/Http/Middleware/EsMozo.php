<?php

namespace App\Http\Middleware;

use App\Models\Usuario;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EsMozo
{
    public function handle(Request $request, Closure $next): Response
    {
        $usuario = $request->user();

        if (! $usuario instanceof Usuario || $usuario->rol->nombre !== 'Mozo') {
            return response()->json([
                'message' => 'No tenes permisos para realizar esta accion.',
            ], 403);
        }

        return $next($request);
    }
}
