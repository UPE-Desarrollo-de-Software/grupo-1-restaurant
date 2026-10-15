<?php

namespace App\Repositories;

use App\Models\Usuario;
use Illuminate\Support\Collection;

/**
 * Puerto de persistencia de USUARIOS (capa Repository).
 *
 * Incluye la emisión/revocación de tokens Sanctum: es escritura en
 * `personal_access_tokens`, por lo que vive acá y no en el Service.
 */
interface UsuarioRepository
{
    /**
     * Usuario por email, con su rol cargado (login).
     */
    public function buscarPorEmail(string $email): ?Usuario;

    /**
     * Todos los usuarios con su rol (listado del panel).
     *
     * @return Collection<int, Usuario>
     */
    public function listar(): Collection;

    /**
     * Usuario por id con su rol; null si no existe.
     */
    public function porId(int $id): ?Usuario;

    /**
     * Alta de usuario con la contraseña ya hasheada por el caller.
     *
     * @param  array<string, mixed>  $datos
     */
    public function crear(array $datos): Usuario;

    /**
     * Persiste los cambios del usuario (el caller ya preparó $datos).
     *
     * @param  array<string, mixed>  $datos
     */
    public function guardar(Usuario $usuario, array $datos): Usuario;

    /**
     * ¿Queda otro gerente activo además del indicado?
     */
    public function otroGerenteActivo(int $rolGerenteId, int $exceptoId): bool;

    /**
     * Emite un token Sanctum y devuelve el token plano.
     */
    public function emitirToken(Usuario $usuario, string $nombre): string;

    /**
     * Borra todos los tokens del usuario (cierre de sesión / revocación).
     */
    public function revocarTokens(Usuario $usuario): void;
}
