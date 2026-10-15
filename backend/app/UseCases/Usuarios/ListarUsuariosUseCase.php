<?php

namespace App\UseCases\Usuarios;

use App\Models\Usuario;
use App\Services\UsuarioService;
use Illuminate\Support\Collection;

/**
 * CASO DE USO: listar los usuarios empleados con su rol
 * (GET /api/usuarios).
 */
class ListarUsuariosUseCase
{
    public function __construct(private UsuarioService $usuarios) {}

    /**
     * @return Collection<int, Usuario>
     */
    public function __invoke(): Collection
    {
        return $this->usuarios->listar();
    }
}
