<?php

namespace App\Services;

use App\Models\Sesion;
use App\Models\Usuario;
use App\Models\Mesa;
use Illuminate\Database\Eloquent\Collection;

class SesionService
{
    /**
     * Crear una nueva sesión para un grupo de clientes
     */
    public function crearSesion(Usuario $mozo, array $mesasIds): Sesion
    {
        // Generar código grupal único (4 dígitos)
        $codigoGrupal = $this->generarCodigoGrupal();

        // Crear la sesión
        $sesion = Sesion::create([
            'mozoID' => $mozo->id,
            'codigoGrupal' => $codigoGrupal,
            'inicio' => now(),
            'estado' => 'activa',

        ]);

        // Filtrar y asociar mesas
        $mesasIds = array_filter($mesasIds, fn($id) => $id !== null);

        if (!empty($mesasIds)) {
            $sesion->mesas()->attach($mesasIds);
        }

        return $sesion;
    }

    /**
     * Validar que un código grupal existe y está activo
     */
    public function validarCodigoGrupal(string $codigo): ?Sesion
    {
        return Sesion::where('codigoGrupal', $codigo)
            ->where('estado', 'activa')
            ->first();
    }

    /**
     * Login del cliente con código grupal
     * Retorna token Sanctum
     */
    public function loginConCodigoGrupal(string $codigo)
    {
        // Validar código
        $sesion = $this->validarCodigoGrupal($codigo);

        if (!$sesion) {
            return response()->json([
                'message' => 'Código grupal inválido o expirado'
            ], 401);
        }

        // Generar token Sanctum (igual que con Usuario)
        $token = $sesion->createToken('cliente_token')->plainTextToken;

        // Obtener detalles de mesas
        $mesas = $sesion->mesas()->select('mesas.id', 'capacidad')->get();

        return response()->json([
            'message' => 'Inicio de sesión exitoso',
            'sesion' => [
                'id' => $sesion->id,
                'codigoGrupal' => $sesion->codigoGrupal,
                'mozo' => $sesion->mozo->nombre,
                'mesas' => $mesas,
            ],
            'token' => $token
        ]);
    }

    /**
     * Cerrar sesión 
     */
    public function cerrarSesion(Sesion $sesion)
    {

        $sesion->cerrar();
        $sesion->tokens()->delete();

        return response()->json([
            'message' => 'Cierre de sesión exitoso'
        ]);
    }

    /**
     * Obtener detalles de la sesión actual
     */
    public function obtenerDetalles(Sesion $sesion)
    {
        return response()->json([
            'sesion' => [
                'id' => $sesion->id,
                'codigoGrupal' => $sesion->codigoGrupal,
                'estado' => $sesion->estado,
                'mozo' => $sesion->mozo->nombre,
                'inicio' => $sesion->inicio,
                'fin' => $sesion->fin,
                'mesas' => $sesion->mesas()->select('mesas.id', 'numero_mesa', 'capacidad')->get(),
            ]
        ]);
    }


    /**
     * Obtener clientes activos en una sesión
     */
    public function obtenerClientesActivos(Sesion $sesion): int
    {
        return $sesion->tokens()->where('revoked', false)->count();
    }

    /**
     * Generar código grupal único de 4 dígitos
     */
    private function generarCodigoGrupal(): string
    {
        do {
            $codigo = str_pad(random_int(0, 9999), 4, '0', STR_PAD_LEFT);
        } while (Sesion::where('codigoGrupal', $codigo)->where('estado', 'activa')->exists());

        return $codigo;
    }
}
