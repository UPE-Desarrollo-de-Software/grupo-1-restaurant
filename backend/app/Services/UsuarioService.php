<?php

namespace App\Services;

use App\Models\Usuario;
use App\Repositories\RolRepository;
use App\Repositories\UsuarioRepository;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Hash;

/**
 * Ciclo de vida de los usuarios empleados (capa de dominio).
 *
 * Reglas que vive acá: contraseña hasheada, revocación de tokens al
 * cambiar de rol / desactivar. Las protecciones de aplicación (último
 * gerente, editarse a uno mismo) viven en los UseCases
 * ActualizarUsuarioUseCase / DarBajaUsuarioUseCase.
 */
class UsuarioService
{
    public function __construct(
        private UsuarioRepository $usuarios,
        private RolRepository $roles,
    ) {}

    public function register(string $nombre, string $email, string $password, int $rol_id, bool $activo = true): Usuario
    {
        return $this->usuarios->crear([
            'nombre' => $nombre,
            'email' => $email,
            'password' => Hash::make($password),
            'rol_id' => $rol_id,
            'activo' => $activo,
        ]);
    }

    /**
     * @return Collection<int, Usuario>
     */
    public function listar(): Collection
    {
        return $this->usuarios->listar();
    }

    public function obtenerPorId(int $id): ?Usuario
    {
        return $this->usuarios->porId($id);
    }

    /**
     * @param  array<string, mixed>  $datos
     */
    public function actualizar(int $id, array $datos): ?Usuario
    {
        $usuario = $this->usuarios->porId($id);

        if (! $usuario) {
            return null;
        }

        $rolAnterior = $usuario->rol_id;

        if (! empty($datos['password'])) {
            $datos['password'] = Hash::make($datos['password']);
        } else {
            unset($datos['password']);   // no pisar la contraseña con vacío/null
        }

        $usuario = $this->usuarios->guardar($usuario, $datos);

        if (array_key_exists('rol_id', $datos) && (int) $datos['rol_id'] !== (int) $rolAnterior) {
            $this->usuarios->revocarTokens($usuario);   // cambió de rol → sesiones abiertas invalidadas
        }

        if ($usuario->activo === false) {
            $this->usuarios->revocarTokens($usuario);   // usuario desactivado → sesiones abiertas invalidadas
        }

        return $usuario;
    }

    /**
     * Baja lógica: `activo = false` + revoca sus tokens.
     */
    public function eliminar(int $id): ?Usuario
    {
        $usuario = $this->usuarios->porId($id);

        if (! $usuario) {
            return null;
        }

        $this->usuarios->revocarTokens($usuario);

        return $this->usuarios->guardar($usuario, ['activo' => false]);
    }

    public function reactivar(int $id): ?Usuario
    {
        $usuario = $this->usuarios->porId($id);

        if (! $usuario) {
            return null;
        }

        return $this->usuarios->guardar($usuario, ['activo' => true]);
    }

    /**
     * ¿Queda otro gerente activo además del indicado? (protección para
     * no dejar el sistema sin gerentes).
     */
    public function quedaOtroGerenteActivo(int $exceptoId): bool
    {
        return $this->usuarios->otroGerenteActivo($this->rolGerenteId(), $exceptoId);
    }

    public function rolGerenteId(): int
    {
        return $this->roles->idPorNombre('Gerente') ?? 0;
    }
}
