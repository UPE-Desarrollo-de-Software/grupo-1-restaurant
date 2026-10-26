<?php

namespace Database\Seeders;

use App\Models\Permiso;
use Illuminate\Database\Seeder;

/**
 * PERMISOS (DER v2.1, tabla PERMISO).
 *
 * Cada permiso pertenece a un módulo. Los middlewares los consultan
 * con `permiso:nombre` (ver app/Http/Middleware/TienePermiso.php); la
 * asignación a cada rol la hace RolSeeder.
 *
 * Idempotente: se puede correr varias veces.
 */
class PermisoSeeder extends Seeder
{
    /**
     * @var array<string, list<string>> permisos por módulo
     */
    private const PERMISOS = [
        'usuarios' => [
            'gestionar_usuarios',
            'gestionar_roles',
        ],
        'carta' => [
            'gestionar_categorias',
            'gestionar_platos',
            'gestionar_ingredientes',
            'ver_carta',
        ],
        'promociones' => [
            'gestionar_promociones',
        ],
        'mesas' => [
            'gestionar_mesas',
        ],
        'reservas' => [
            'gestionar_reservas',
        ],
        'pedidos' => [
            'tomar_pedidos',
            'ver_pedidos',
        ],
        'reportes' => [
            'ver_dashboard',
            'ver_historial_comandas',
        ],
    ];

    public function run(): void
    {
        foreach (self::PERMISOS as $modulo => $permisos) {
            foreach ($permisos as $nombre) {
                Permiso::updateOrCreate(
                    ['nombre' => $nombre],
                    ['modulo' => $modulo]
                );
            }
        }
    }
}
