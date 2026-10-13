<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

class Usuario extends Authenticatable
{
    use HasApiTokens;
    use HasFactory;

    protected $table = 'usuarios';

    protected $fillable = [
        'nombre',
        'email',
        'password',
        'rol_id',
        'activo',
    ];

    protected $hidden = [
        'password',
    ];

    protected $casts = [
        'activo' => 'boolean',
    ];

    public function rol()
    {
        return $this->belongsTo(Rol::class);
    }

    /**
     * Chequea si el usuario (vía su rol) tiene el permiso indicado.
     * Es la forma en que los middlewares resuelven la autorización
     * según el DER v2.1 (ROL_PERMISO), sin strings literales del rol.
     */
    public function tienePermiso(string $permiso): bool
    {
        return $this->rol
            ?->permisos()
            ->where('nombre', $permiso)
            ->exists() ?? false;
    }
}
