<?php

namespace App\Http\Middleware;

use App\Models\Usuario;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Autorización por permiso (DER v2.2: tabla ROL_PERMISO).
 *
 * Reemplaza a los viejos middlewares EsGerente / EsMozo, que comparaban
 * el nombre del rol con un string literal ('Gerente' / 'Mozo'). Se usa
 * como middleware con parámetro:
 *
 *   Route::middleware(['auth:sanctum', 'permiso:tomar_pedidos'])
 *
 * El permiso pedido se declara en database/seeders/PermisoSeeder.php y
 * se asigna a cada rol en RolSeeder.php.
 */
class TienePermiso
{
    public function handle(Request $request, Closure $next, string $permiso): Response
    {
        $usuario = $request->user();

        if (! $usuario instanceof Usuario) {
            return response()->json([
                'message' => 'No tenes permisos para realizar esta accion.',
            ], 403);
        }

        if (! $usuario->activo) {
            return response()->json([
                'message' => 'Usuario desactivado. Contacte con el gerente.',
            ], 403);
        }

        if (! $usuario->tienePermiso($permiso)) {
            return response()->json([
                'message' => 'No tenes permisos para realizar esta accion.',
            ], 403);
        }

        return $next($request);
    }
}
