<?php

namespace App\Repositories;

use App\Models\Usuario;
use Illuminate\Support\Collection;

class EloquentUsuarioRepository implements UsuarioRepository
{
    public function buscarPorEmail(string $email): ?Usuario
    {
        return Usuario::with('rol')
            ->where('email', $email)
            ->first();
    }

    public function listar(): Collection
    {
        return Usuario::with('rol')->get();
    }

    public function porId(int $id): ?Usuario
    {
        return Usuario::with('rol')->find($id);
    }

    public function crear(array $datos): Usuario
    {
        return Usuario::create($datos);
    }

    public function guardar(Usuario $usuario, array $datos): Usuario
    {
        $usuario->update($datos);

        return $usuario;
    }

    public function otroGerenteActivo(int $rolGerenteId, int $exceptoId): bool
    {
        return Usuario::where('rol_id', $rolGerenteId)
            ->where('activo', true)
            ->where('id', '!=', $exceptoId)
            ->exists();
    }

    public function emitirToken(Usuario $usuario, string $nombre): string
    {
        return $usuario->createToken($nombre)->plainTextToken;
    }

    public function revocarTokens(Usuario $usuario): void
    {
        $usuario->tokens()->delete();
    }
}
