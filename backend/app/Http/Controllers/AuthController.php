<?php

namespace App\Http\Controllers;

use App\Services\AuthService;;

use App\Models\Usuario;

use Illuminate\Http\Request;

class AuthController extends Controller
{
    public function __construct(private AuthService $usuarioService) {}

    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);
        return $this->usuarioService->login(
            $request->email,
            $request->password
        );
    }


    public function logout(Request $request)
    {
        $usuario = $request->user();
        if (!$usuario instanceof Usuario) {

            return response()->json([
                'message' => 'Usuario no autenticado'
            ], 401);
        }

        return $this->usuarioService->logout($usuario);
    }
}
