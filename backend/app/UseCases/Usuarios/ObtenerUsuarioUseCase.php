<?php

namespace App\UseCases\Usuarios;

use App\Models\Usuario;
use App\Services\UsuarioService;

/**
 * CASO DE USO: obtener un usuario empleado por id (GET /api/usuarios/{id}).
 * Devuelve null cuando no existe (el controller responde 200 + message,
 * convención "no encontrado" del repo).
 */
class ObtenerUsuarioUseCase
{
    public function __construct(private UsuarioService $usuarios) {}

    public function __invoke(int $id): ?Usuario
    {
        return $this->usuarios->obtenerPorId($id);
    }
}
