<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use App\Models\Rol;
use Illuminate\Database\Seeder;

class RolSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        Rol::create([
            'nombre' => 'Gerente'
        ]);

        Rol::create([
            'nombre' => 'Cocina'
        ]);

        Rol::create([
            'nombre' => 'Mozo'
        ]);

        Rol::create([
            'nombre' => 'Cliente'
        ]);
    }
}
