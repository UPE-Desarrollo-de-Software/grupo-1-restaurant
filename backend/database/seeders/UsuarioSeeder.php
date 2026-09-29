<?php

namespace Database\Seeders;

use App\Models\Rol;
use App\Models\Usuario;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UsuarioSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $rolGerente = Rol::where('nombre', 'Gerente')->first();

        Usuario::create([
            'nombre' => 'Gerente',
            'email' => 'gerente@restaurant.com',
            'password' => Hash::make('123456'),
            'rol_id' => $rolGerente->id
        ]);
    }
}
