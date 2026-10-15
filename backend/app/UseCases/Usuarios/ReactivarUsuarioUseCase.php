<?php

namespace App\UseCases\Usuarios;

use App\Models\Usuario;
use App\Services\UsuarioService;

/**
 * CASO DE USO: reactivar un usuario empleado
 * (POST /api/usuarios/{id}/reactivar).
 */
class ReactivarUsuarioUseCase
{
    public function __construct(private UsuarioService $usuarios) {}

    public function __invoke(int $id): ?Usuario
    {
        return $this->usuarios->reactivar($id);
    }
}
