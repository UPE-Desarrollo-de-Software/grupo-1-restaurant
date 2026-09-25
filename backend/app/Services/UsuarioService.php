<?php

namespace App\Services;

use App\Models\Usuario;
use Illuminate\Support\Facades\Hash;

class UsuarioService
{
    public function register(string $nombre, string $email, string $password, int $rol_id)
    {
        $usuario = Usuario::create([
            'nombre' => $nombre,
            'email' => $email,
            'password' => Hash::make($password),
            'rol_id' => $rol_id
        ]);



        return response()->json([
            'message' => 'Registro exitoso',
            'usuario' => $usuario
        ]);
    }
}
