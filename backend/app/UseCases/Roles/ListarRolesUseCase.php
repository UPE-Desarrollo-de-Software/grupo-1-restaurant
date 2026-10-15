<?php

namespace App\UseCases\Roles;

use App\Models\Rol;
use App\Services\RolService;
use Illuminate\Support\Collection;

/**
 * CASO DE USO: listar los roles disponibles (GET /api/roles), para el
 * alta de usuarios en el front.
 */
class ListarRolesUseCase
{
    public function __construct(private RolService $roles) {}

    /**
     * @return Collection<int, Rol>
     */
    public function __invoke(): Collection
    {
        return $this->roles->listar();
    }
}
