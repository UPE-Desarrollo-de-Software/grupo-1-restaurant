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
     * Nota (rebote 2): se eliminó el rol 'Cliente': la entidad CLIENTE
     * salió del DER, no hay más login ni tokens de cliente (el acceso
     * del comensal es el código de la mesa, sin rol).
     *
     * @var array<string, list<string>|'todos'>
     */
    private const ASIGNACIONES = [
        'Gerente' => 'todos',
        'Cocina' => ['ver_carta', 'ver_pedidos', 'ver_historial_comandas'],
        'Mozo' => ['ver_carta', 'ver_pedidos', 'tomar_pedidos', 'gestionar_reservas'],
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
