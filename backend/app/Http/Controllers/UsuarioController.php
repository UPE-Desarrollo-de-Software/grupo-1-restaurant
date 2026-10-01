<?php

namespace App\Http\Controllers;

use App\Services\UsuarioService;
use Illuminate\Http\Request;

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
            'activo' => 'sometimes|boolean'
        ]);

        return $this->usuarioService->register(
            $request->nombre,
            $request->email,
            $request->password,
            $request->rol_id,
            $request->boolean('activo', true),
        );
    }
    public function index()
    {
        return $this->usuarioService->listar();
    }
    public function show(int $id)
    {
        $usuario = $this->usuarioService->obtenerPorId($id);
        if (! $usuario) {
            return response()->json(['message' => 'Usuario no encontrado'], 404);
        }
        return $usuario;
    }
    public function update(Request $request, int $id)
    {
        $usuario = $this->usuarioService->obtenerPorId($id);

        if (! $usuario) {
            return response()->json(['message' => 'Usuario no encontrado'], 200);
        }

        $datos = $request->validate([
            'nombre' => 'sometimes|required|string|max:255',
            'email' => 'sometimes|required|string|email|max:255|unique:usuarios,email,' . $id,
            'password' => 'sometimes|nullable|string|min:6',
            'rol_id' => 'sometimes|required|exists:rol,id',
            'activo' => 'sometimes|boolean',
        ]);

        if (empty($datos)) {
            return response()->json(['message' => 'No se proporcionaron datos para actualizar'], 400);
        }

        // --- protecciones sobre lo que quedaría después del update ---
        $esBaja = array_key_exists('activo', $datos) && ! (bool) $datos['activo'];
        $esCambioDeRol = isset($datos['rol_id'])
            && (int) $datos['rol_id'] !== $this->usuarioService->rolGerenteId();

        // 1) nadie se baja ni se cambia de rol a sí mismo
        if ($request->user()->id === $id) {
            if ($esCambioDeRol) {
                return response()->json(['message' => 'No podés cambiar tu propio rol.'], 403);
            }
            if ($esBaja) {
                return response()->json(['message' => 'No podés darte de baja a vos mismo desde la edición.'], 403);
            }
        }

        // 2) no dejar al sistema sin gerentes
        if (($esBaja || $esCambioDeRol)
            && $usuario->rol->nombre === 'Gerente'
            && ! $this->usuarioService->quedaOtroGerenteActivo($usuario->id)
        ) {
            return response()->json(['message' => 'No se puede dar de baja o cambiar el rol del último gerente activo.'], 403);
        }

        return $this->usuarioService->actualizar($id, $datos);
    }
    public function destroy(Request $request, int $id)
    {
        $usuario = $this->usuarioService->obtenerPorId($id);

        if (! $usuario) {
            return response()->json(['message' => 'Usuario no encontrado'], 200);
        }
        if ($usuario->id === $request->user()->id) {
            return response()->json(['message' => 'No podés dar de baja tu propio usuario.'], 403);
        }
        if ($usuario->rol->nombre === 'Gerente' && ! $this->usuarioService->quedaOtroGerenteActivo($usuario->id)) {
            return response()->json(['message' => 'No se puede dar de baja al último gerente activo.'], 403);
        }

        $this->usuarioService->eliminar($usuario->id);
        return response()->json(['message' => 'Usuario dado de baja exitosamente'], 200);
    }
    public function reactivar(Request $request, int $id)
    {
        $usuario = $this->usuarioService->obtenerPorId($id);

        if (! $usuario) {
            return response()->json(['message' => 'Usuario no encontrado'], 404);
        }

        $this->usuarioService->reactivar($usuario->id);
        return response()->json(['message' => 'Usuario reactivado exitosamente'], 200);
    }
}
