<?php

namespace App\UseCases\Usuarios;

use App\Models\Usuario;
use App\Services\UsuarioService;

/**
 * CASO DE USO: registrar un usuario empleado (POST /api/usuarios/registrar).
 *
 * Capa de aplicación (Controller → UseCase → Service → Repository).
 */
class RegistrarUsuarioUseCase
{
    public function __construct(private UsuarioService $usuarios) {}

    public function __invoke(
        string $nombre,
        string $email,
        string $password,
        int $rolId,
        bool $activo = true,
    ): Usuario {
        return $this->usuarios->register($nombre, $email, $password, $rolId, $activo);
    }
}
