<?php

namespace App\Services;

use App\Models\Cliente;
use App\Models\Sesion;
use App\Models\Usuario;

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

        if (! empty($mesasIds)) {
            $sesion->mesas()->attach($mesasIds);
            $sesion->mesas()->update(['estado' => 'ocupada']);
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
    public function loginConCodigoGrupal(string $codigo, ?string $nombre = null)
    {
        // Validar código
        $sesion = $this->validarCodigoGrupal($codigo);

        if (! $sesion) {
            return response()->json([
                'message' => 'Código grupal inválido o expirado',
            ], 401);
        }

        $capacidad = (int) $sesion->mesas()->sum('capacidad');

        if ($capacidad == 0) {
            return response()->json([
                'message' => 'La sesion no tiene mesa asignada',
            ], 403);
        }

        if ($this->clientesActivos($sesion) >= $capacidad) {
            return response()->json([
                'message' => 'La mesa esta completa',
                'capacidad' => $capacidad,
            ], 403);
        }

        // Generar token Sanctum (igual que con Usuario)

        $cliente = $sesion->clientes()->create(['nombre' => $nombre]);

        $token = $cliente->createToken('cliente_token')->plainTextToken;

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
            'cliente' => [
                'id' => $cliente->id,
                'nombre' => $cliente->nombre,
            ],
            'token' => $token,
        ]);
    }

    /**
     * Cerrar sesión
     */
    public function cerrarSesion(Sesion $sesion)
    {
        $sesion->cerrar();
        $sesion->mesas()->update(['estado' => 'disponible']);
        $sesion->mesas()->detach();
        $sesion->clientes()->get()->each(fn(Cliente $c) => $c->tokens()->delete());

        return response()->json([
            'message' => 'Cierre de sesión exitoso',
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
                'mesas' => $sesion->mesas()->select('mesas.id', 'capacidad')->get(),
            ],
        ]);
    }

    /**
     * Obtener clientes activos en una sesión
     */
    public function obtenerClientesActivos(Sesion $sesion): int
    {
        return $this->clientesActivos($sesion);
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

    private function clientesActivos(Sesion $sesion): int
    {
        return $sesion->clientes()
            ->whereHas('tokens')
            ->count();
    }

    public function logoutCliente(Cliente $cliente)
    {
        $cliente->tokens()->delete();

        return response()->json(['message' => 'Cierre de sesión exitoso']);
    }
}
