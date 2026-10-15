<?php

namespace App\Repositories;

use App\Models\Rol;
use Illuminate\Support\Collection;

/**
 * Puerto de persistencia de ROLES (arquitectura hexagonal: capa
 * Repository). La única que toca la tabla `rol` desde la aplicación.
 */
interface RolRepository
{
    /**
     * Todos los roles (para el alta de usuarios en el front).
     *
     * @return Collection<int, Rol>
     */
    public function todos(): Collection;

    /**
     * Id del rol por nombre literal ('Gerente', 'Mozo', ...), null si
     * no existe.
     */
    public function idPorNombre(string $nombre): ?int;
}
