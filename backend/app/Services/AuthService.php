<?php

namespace App\Services;

use App\Exceptions\ApiException;
use App\Models\Usuario;
use App\Repositories\UsuarioRepository;
use Illuminate\Support\Facades\Hash;

/**
 * Sesión de empleados (login/logout por token Sanctum).
 *
 * Capa de dominio de la arquitectura hexagonal: NO arma respuestas
 * (antes devolvía response()->json desde acá). Los errores de
 * autenticación salen como ApiException con su estado HTTP, que
 * bootstrap/app.php convierte en JSON {message}.
 */
class AuthService
{
    public function __construct(private UsuarioRepository $usuarios) {}

    /**
     * Valida credenciales y emite el token.
     *
     * @return array{usuario: Usuario, token: string}
     *
     * @throws ApiException 401 credenciales inválidas / 403 usuario inactivo
     */
    public function login(string $email, string $password): array
    {
        $usuario = $this->usuarios->buscarPorEmail($email);

        if (! $usuario || ! Hash::check($password, $usuario->password)) {
            throw new ApiException(401, 'Credenciales inválidas');
        }

        if (! $usuario->activo) {
            throw new ApiException(403, 'Usuario inactivo. Contacte al administrador.');
        }

        return [
            'usuario' => $usuario,
            'token' => $this->usuarios->emitirToken($usuario, 'auth_token'),
        ];
    }

    /**
     * Cierra la sesión: revoca todos los tokens del usuario.
     */
    public function logout(Usuario $usuario): void
    {
        $this->usuarios->revocarTokens($usuario);
    }
}
