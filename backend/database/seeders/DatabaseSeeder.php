<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Orden importa: permisos antes de roles (RolSeeder los
        // asigna); usuarios antes de nada que los referencie. Las MESAS
        // ya NO se precrean (rebote 2: entidad dinámica contra el
        // aforo) — solo se seedea la CONFIG_MESA (25×4 = aforo 100).
        $this->call([
            PermisoSeeder::class,
            RolSeeder::class,
            UsuarioSeeder::class,
            ConfigMesaSeeder::class,
            CategoriaSeeder::class,
            IngredienteSeeder::class,
            PlatoSeeder::class,
        ]);
    }
}
