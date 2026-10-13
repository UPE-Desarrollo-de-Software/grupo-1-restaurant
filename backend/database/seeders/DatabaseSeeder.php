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
        // asigna), y usuarios antes de mesas (MesaSeeder asigna el
        // mozo responsable).
        $this->call([
            PermisoSeeder::class,
            RolSeeder::class,
            UsuarioSeeder::class,
            MesaSeeder::class,
            CategoriaSeeder::class,
            IngredienteSeeder::class,
            PlatoSeeder::class,
        ]);
    }
}
