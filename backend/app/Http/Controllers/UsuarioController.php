<?php

namespace App\Http\Controllers;

use App\UseCases\Usuarios\ActualizarUsuarioUseCase;
use App\UseCases\Usuarios\DarBajaUsuarioUseCase;
use App\UseCases\Usuarios\ListarUsuariosUseCase;
use App\UseCases\Usuarios\ObtenerUsuarioUseCase;
use App\UseCases\Usuarios\ReactivarUsuarioUseCase;
use App\UseCases\Usuarios\RegistrarUsuarioUseCase;
use Illuminate\Http\Request;

/**
 * Usuarios empleados. Las protecciones (nadie se baja a sí mismo, no
 * dejar al sistema sin gerentes) viven en los Use Cases, no acá.
 */
class UsuarioController extends Controller
{
    public function __construct(
        private RegistrarUsuarioUseCase $registrar,
        private ListarUsuariosUseCase $listar,
        private ObtenerUsuarioUseCase $obtener,
        private ActualizarUsuarioUseCase $actualizar,
        private DarBajaUsuarioUseCase $darBaja,
        private ReactivarUsuarioUseCase $reactivar,
    ) {}

    public function register(Request $request)
    {
        $request->validate([
            'nombre' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:usuarios',
            'password' => 'required|string|min:6',
            'rol_id' => 'required|exists:rol,id',
            'activo' => 'sometimes|boolean',
        ]);

        return ($this->registrar)(
            $request->nombre,
            $request->email,
            $request->password,
            $request->rol_id,
            $request->boolean('activo', true),
        );
    }

    public function index()
    {
        return ($this->listar)();
    }

    public function show(int $id)
    {
        $usuario = ($this->obtener)($id);

        if (! $usuario) {
            return response()->json(['message' => 'Usuario no encontrado'], 200);
        }

        return $usuario;
    }

    public function update(Request $request, int $id)
    {
        $datos = $request->validate([
            'nombre' => 'sometimes|required|string|max:255',
            'email' => 'sometimes|required|string|email|max:255|unique:usuarios,email,'.$id,
            'password' => 'sometimes|nullable|string|min:6',
            'rol_id' => 'sometimes|required|exists:rol,id',
            'activo' => 'sometimes|boolean',
        ]);

        $usuario = ($this->actualizar)($id, $datos, $request->user()->id);

        if (! $usuario) {
            return response()->json(['message' => 'Usuario no encontrado'], 200);
        }

        return $usuario;
    }

    public function destroy(Request $request, int $id)
    {
        $usuario = ($this->darBaja)($id, $request->user()->id);

        if (! $usuario) {
            return response()->json(['message' => 'Usuario no encontrado'], 200);
        }

        return response()->json(['message' => 'Usuario dado de baja exitosamente'], 200);
    }

    public function reactivar(Request $request, int $id)
    {
        $usuario = ($this->reactivar)($id);

        if (! $usuario) {
            return response()->json(['message' => 'Usuario no encontrado'], 200);
        }

        return response()->json(['message' => 'Usuario reactivado exitosamente'], 200);
    }
}
