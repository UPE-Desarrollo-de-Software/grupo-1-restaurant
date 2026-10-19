<?php

namespace App\Repositories;

use App\Models\Reserva;
use Illuminate\Support\Collection;

/**
 * Puerto de persistencia de RESERVAS (capa Repository).
 *
 * La lógica de negocio (lead time, conflictos, transiciones de estado,
 * mozo virtual) vive en ReservaService; acá solo se persiste y se
 * consultan los datos que esas reglas necesitan.
 */
interface ReservaRepository
{
    /**
     * Reserva por id con su mesa cargada; lanza ModelNotFoundException
     * (404) si no existe.
     */
    public function porIdOrFail(int $id): Reserva;

    /**
     * @param  array<string, mixed>  $datos
     */
    public function crear(array $datos): Reserva;

    /**
     * ¿Existe otra reserva PENDIENTE de la misma mesa en la misma
     * fecha y hora exacta? (conflicto por solapamiento simple).
     */
    public function existeConflicto(int $mesaId, string $fecha, string $hora): bool;

    /**
     * Listado de reservas con filtros opcionales (estado, fecha,
     * mesa_id); siempre con la mesa cargada.
     *
     * @return Collection<int, Reserva>
     */
    public function filtradas(?string $estado, ?string $fecha, ?int $mesaId): Collection;

    /**
     * ¿Queda alguna reserva PENDIENTE de la mesa en esa fecha? (para
     * saber si al cerrar una reserva se puede liberar el estado
     * 'reservada' de la mesa).
     */
    public function hayPendienteEnFecha(int $mesaId, string $fecha): bool;

    /**
     * Reservas PENDIENTES de una mesa (al destruirla se cancelan).
     *
     * @return Collection<int, Reserva>
     */
    public function pendientesDeMesa(int $mesaId): Collection;
}
