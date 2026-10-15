<?php

namespace Database\Seeders;

use App\Models\Rol;
use App\Models\Usuario;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Usuarios de prueba: el gerente que se usa para loguearse y un mozo
 * (el mozo queda como responsable de las mesas del MesaSeeder).
 * Idempotente por email.
 */
class UsuarioSeeder extends Seeder
{
    public function run(): void
    {
        $usuarios = [
            [
                'nombre' => 'Gerente',
                'email' => 'gerente@restaurant.com',
                'password' => '123456',
                'rol' => 'Gerente',
            ],
            [
                'nombre' => 'Mozo',
                'email' => 'mozo@restaurant.com',
                'password' => '123456',
                'rol' => 'Mozo',
            ],
        ];

        foreach ($usuarios as $datos) {
            $rol = Rol::where('nombre', $datos['rol'])->first();

            Usuario::updateOrCreate(
                ['email' => $datos['email']],
                [
                    'nombre' => $datos['nombre'],
                    'password' => Hash::make($datos['password']),
                    'rol_id' => $rol->id,
                    'activo' => true,
                ]
            );
        }
    }
}
