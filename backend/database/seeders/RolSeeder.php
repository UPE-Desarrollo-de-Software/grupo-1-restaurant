<?php

namespace Database\Seeders;

use App\Models\Permiso;
use App\Models\Rol;
use Illuminate\Database\Seeder;

/**
 * ROLES + asignación de permisos (DER v2.1: ROL_PERMISO).
 *
 * Requiere PermisoSeeder corrido antes (busca los permisos por nombre).
 * Idempotente: los roles se crean con updateOrCreate y los permisos se
 * sincronizan.
 */
class RolSeeder extends Seeder
{
    /**
     * Permisos asignados a cada rol. 'todos' = todos los permisos
     * sembrados (Gerente).
     *
     * Nota sobre 'Cliente': el rol se conserva porque la funcionalidad
     * congelada de clientes (sesiones por código grupal) podría volver;
     * no tiene ningún permiso mientras esté desconectada del DER.
     *
     * @var array<string, list<string>|'todos'>
     */
    private const ASIGNACIONES = [
        'Gerente' => 'todos',
        'Cocina' => ['ver_carta', 'ver_pedidos'],
        'Mozo' => ['ver_carta', 'ver_pedidos', 'tomar_pedidos', 'gestionar_reservas'],
        'Cliente' => [],
    ];

    public function run(): void
    {
        $todosLosPermisos = Permiso::pluck('id')->all();

        foreach (self::ASIGNACIONES as $nombreRol => $permisos) {
            $rol = Rol::updateOrCreate(['nombre' => $nombreRol]);

            $ids = $permisos === 'todos'
                ? $todosLosPermisos
                : Permiso::whereIn('nombre', $permisos)->pluck('id')->all();

            $rol->permisos()->sync($ids);
        }
    }
}
