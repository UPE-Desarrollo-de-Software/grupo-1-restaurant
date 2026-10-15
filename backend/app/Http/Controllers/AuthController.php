<?php

namespace App\Http\Controllers;

use App\Models\Usuario;
use App\UseCases\Auth\LoginUsuarioUseCase;
use App\UseCases\Auth\LogoutUsuarioUseCase;
use Illuminate\Http\Request;

/**
 * Sesión del empleado (login/logout por token Sanctum).
 *
 * Arquitectura hexagonal: valida el input, delega en los Use Cases y
 * arma el JSON. Los errores de credenciales salen como ApiException
 * (401/403) resuelta por bootstrap/app.php.
 */
class AuthController extends Controller
{
    public function __construct(
        private LoginUsuarioUseCase $loginUsuario,
        private LogoutUsuarioUseCase $logoutUsuario,
    ) {}

    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $resultado = ($this->loginUsuario)($request->email, $request->password);

        return response()->json([
            'message' => 'Bienvenido',
            'usuario' => $resultado['usuario'],
            'token' => $resultado['token'],
        ], 200);
    }

    public function logout(Request $request)
    {
        $usuario = $request->user();

        if (! $usuario instanceof Usuario) {
            return response()->json([
                'message' => 'Usuario no autenticado',
            ], 401);
        }

        ($this->logoutUsuario)($usuario);

        return response()->json([
            'message' => 'Sesión cerrada',
        ], 200);
    }
}
