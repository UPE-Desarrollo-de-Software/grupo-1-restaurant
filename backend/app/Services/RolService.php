<?php

namespace App\Services;

use App\Models\Rol;
use App\Repositories\RolRepository;
use Illuminate\Support\Collection;

/**
 * Roles (capa de dominio sobre el Repository; antes RolController
 * leía el modelo directo).
 */
class RolService
{
    public function __construct(private RolRepository $roles) {}

    /**
     * @return Collection<int, Rol>
     */
    public function listar(): Collection
    {
        return $this->roles->todos();
    }
}
