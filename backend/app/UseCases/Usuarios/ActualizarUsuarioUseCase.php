<?php

namespace App\UseCases\Usuarios;

use App\Exceptions\ApiException;
use App\Models\Usuario;
use App\Services\UsuarioService;

/**
 * CASO DE USO: actualizar un usuario empleado
 * (PUT /api/usuarios/{id}).
 *
 * Acá viven las REGLAS DE APLICACIÓN que antes estaban en el
 * controller (patrón Use Case: la orquestación y sus garantías no son
 * responsabilidad del HTTP):
 *  - nadie se cambia de rol a sí mismo ni se da de baja en la edición;
 *  - no se puede dejar el sistema sin gerentes (último gerente activo);
 *  - no se pueden aplicar cambios vacíos (400).
 */
class ActualizarUsuarioUseCase
{
    public function __construct(private UsuarioService $usuarios) {}

    /**
     * @param  array<string, mixed>  $datos  datos ya validados por el controller
     *
     * @throws ApiException 400 sin datos / 403 protecciones de rol
     */
    public function __invoke(int $id, array $datos, int $solicitanteId): ?Usuario
    {
        $usuario = $this->usuarios->obtenerPorId($id);

        if (! $usuario) {
            return null;
        }

        if (empty($datos)) {
            throw new ApiException(400, 'No se proporcionaron datos para actualizar');
        }

        $esBaja = array_key_exists('activo', $datos) && ! (bool) $datos['activo'];
        $esCambioDeRol = isset($datos['rol_id'])
            && (int) $datos['rol_id'] !== (int) $usuario->rol_id;

        // 1) nadie se baja ni se cambia de rol a sí mismo
        if ($solicitanteId === $id) {
            if ($esCambioDeRol) {
                throw new ApiException(403, 'No podés cambiar tu propio rol.');
            }
            if ($esBaja) {
                throw new ApiException(403, 'No podés darte de baja a vos mismo desde la edición.');
            }
        }

        // 2) no dejar al sistema sin gerentes
        if (($esBaja || $esCambioDeRol)
            && $usuario->rol->nombre === 'Gerente'
            && ! $this->usuarios->quedaOtroGerenteActivo($usuario->id)
        ) {
            throw new ApiException(403, 'No se puede dar de baja o cambiar el rol del último gerente activo.');
        }

        return $this->usuarios->actualizar($id, $datos);
    }
}
