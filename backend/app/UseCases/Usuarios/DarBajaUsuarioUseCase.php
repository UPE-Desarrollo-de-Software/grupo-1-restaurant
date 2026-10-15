<?php

namespace App\UseCases\Usuarios;

use App\Exceptions\ApiException;
use App\Models\Usuario;
use App\Services\UsuarioService;

/**
 * CASO DE USO: dar de baja un usuario empleado
 * (DELETE /api/usuarios/{id}). Reglas de aplicación:
 *  - nadie se da de baja a sí mismo;
 *  - no se puede dar de baja al último gerente activo.
 */
class DarBajaUsuarioUseCase
{
    public function __construct(private UsuarioService $usuarios) {}

    /**
     * @throws ApiException 403 protecciones
     */
    public function __invoke(int $id, int $solicitanteId): ?Usuario
    {
        $usuario = $this->usuarios->obtenerPorId($id);

        if (! $usuario) {
            return null;
        }

        if ($usuario->id === $solicitanteId) {
            throw new ApiException(403, 'No podés dar de baja tu propio usuario.');
        }

        if ($usuario->rol->nombre === 'Gerente'
            && ! $this->usuarios->quedaOtroGerenteActivo($usuario->id)
        ) {
            throw new ApiException(403, 'No se puede dar de baja al último gerente activo.');
        }

        $this->usuarios->eliminar($usuario->id);

        return $usuario;
    }
}
