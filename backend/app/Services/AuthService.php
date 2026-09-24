<?php

namespace App\Services;

use App\Models\Usuario;
use Illuminate\Support\Facades\Hash;

class AuthService
{
    public function login(string $email, string $password)
    {
        $usuario = Usuario::with('rol')
            ->where('email', $email)
            ->first();

        if (!$usuario || !Hash::check($password, $usuario->password)) {
            return response()->json([
                'message' => 'Credenciales inválidas'
            ], 401);
        }

        // generar token (sanctum)
        return response()->json([
            'message' => 'Inicio de sesión exitoso',
            'usuario' => $usuario
        ]);
    }
}
