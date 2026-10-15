<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

/**
 * PERMISO (DER v2.2): permiso de autorización agrupado por módulo.
 * Los roles reciben permisos a través del pivot ROL_PERMISO
 * (tabla `rol_permiso`).
 */
class Permiso extends Model
{
    protected $fillable = [
        'nombre',
        'modulo',
    ];

    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Rol::class, 'rol_permiso', 'permiso_id', 'rol_id');
    }
}
