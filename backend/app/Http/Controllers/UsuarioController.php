<?php

namespace App\http\Controllers;

use Illuminate\Http\Request;
use App\Services\UsuarioService;

class UsuarioController extends Controller
{

    public function __construct(private UsuarioService $usuarioService) {}

    public function register(Request $request)
    {
        $request->validate([
            'nombre' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:usuarios',
            'password' => 'required|string|min:6',
            'rol_id' => 'required|exists:rol,id',
        ]);
        return $this->usuarioService->register(
            $request->nombre,
            $request->email,
            $request->password,
            $request->rol_id
        );
    }
}
