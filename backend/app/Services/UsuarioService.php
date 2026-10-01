<?php

namespace App\Services;

use App\Models\Usuario;
use App\Models\Rol;
use Illuminate\Support\Facades\Hash;

class UsuarioService
{
    public function register(string $nombre, string $email, string $password, int $rol_id, bool $activo = true)
    {
        $usuario = Usuario::create([
            'nombre' => $nombre,
            'email' => $email,
            'password' => Hash::make($password),
            'rol_id' => $rol_id,
            'activo' => $activo,
        ]);



        return response()->json([
            'message' => 'Registro exitoso',
            'usuario' => $usuario
        ]);
    }
    public function listar()
    {
        return Usuario::with('rol')->get();
    }

    public function obtenerPorId(int $id)
    {
        return Usuario::with('rol')->find($id);
    }


    public function actualizar(int $id, array $datos)
    {

        $usuario = Usuario::find($id);
        if (! $usuario) {
            return null;
        }

        $rolAnterior = $usuario->rol_id;

        if (! empty($datos['password'])) {
            $datos['password'] = Hash::make($datos['password']);
        } else {
            unset($datos['password']);   // no pisar la contraseña con vacío/null
        }

        $usuario->update($datos);

        if (array_key_exists('rol_id', $datos) && (int)$datos['rol_id'] !== (int)$rolAnterior) {
            $usuario->tokens()->delete();   // cambió de rol → sesiones abiertas invalidadas
        }

        if ($usuario->activo === false) {
            $usuario->tokens()->delete();   // usuario desactivado → sesiones abiertas invalidadas
        }

        return $usuario;
    }

    public function eliminar(int $id)
    {

        $usuario = Usuario::find($id);
        if (! $usuario) {
            return null;
        }


        $usuario->activo = false;
        $usuario->tokens()->delete(); // Revocar tokens de acceso
        $usuario->save();

        return $usuario;
    }

    public function reactivar(int $id)
    {
        $usuario = Usuario::find($id);
        if (! $usuario) {
            return null;
        }

        $usuario->activo = true;
        $usuario->save();

        return $usuario;
    }

    public function quedaOtroGerenteActivo(int $exceptoId): bool
    {
        $gerenteId = Rol::where('nombre', 'Gerente')->value('id');   // string literal

        return Usuario::where('rol_id', $gerenteId)
            ->where('activo', true)
            ->where('id', '!=', $exceptoId)
            ->exists();
    }

    public function rolGerenteId(): int
    {
        return (int) Rol::where('nombre', 'Gerente')->value('id');
    }
}
