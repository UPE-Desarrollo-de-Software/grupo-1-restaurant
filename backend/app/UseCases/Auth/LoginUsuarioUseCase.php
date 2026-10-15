<?php

namespace App\UseCases\Auth;

use App\Models\Usuario;
use App\Services\AuthService;

/**
 * CASO DE USO: iniciar sesión como empleado (POST /api/login).
 *
 * Capa de aplicación de la arquitectura hexagonal
 * (Controller → UseCase → Service → Repository): valida credenciales
 * y emite el token Sanctum. El controller solo arma el JSON de
 * respuesta; los errores salen como ApiException (401/403) que
 * bootstrap/app.php renderiza.
 */
class LoginUsuarioUseCase
{
    public function __construct(private AuthService $auth) {}

    /**
     * @return array{usuario: Usuario, token: string}
     */
    public function __invoke(string $email, string $password): array
    {
        return $this->auth->login($email, $password);
    }
}
