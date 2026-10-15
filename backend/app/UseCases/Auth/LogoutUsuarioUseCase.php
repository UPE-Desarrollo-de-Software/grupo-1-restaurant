<?php

namespace App\UseCases\Auth;

use App\Models\Usuario;
use App\Services\AuthService;

/**
 * CASO DE USO: cerrar la sesión del empleado (POST /api/logout):
 * revoca todos sus tokens.
 */
class LogoutUsuarioUseCase
{
    public function __construct(private AuthService $auth) {}

    public function __invoke(Usuario $usuario): void
    {
        $this->auth->logout($usuario);
    }
}
