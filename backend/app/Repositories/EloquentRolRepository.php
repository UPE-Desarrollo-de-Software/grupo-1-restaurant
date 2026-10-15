<?php

namespace App\Repositories;

use App\Models\Rol;
use Illuminate\Support\Collection;

class EloquentRolRepository implements RolRepository
{
    public function todos(): Collection
    {
        return Rol::all();
    }

    public function idPorNombre(string $nombre): ?int
    {
        $id = Rol::where('nombre', $nombre)->value('id');

        return $id === null ? null : (int) $id;
    }
}
