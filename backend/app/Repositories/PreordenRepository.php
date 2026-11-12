<?php

namespace App\Repositories;

use App\Models\DetallePreOrden;
use App\Models\Reserva;
use Illuminate\Support\Collection;

/**
 * Puerto de persistencia de la PRE-ORDEN (capa Repository).
 *
 * 1 fila por plato por reserva: `guardar` hace merge por `plato_id`.
 * `pedido_id` NULL = línea pendiente de convertir; `marcarConvertida`
 * lo estampa al convertir la pre-orden en un pedido real (evita la
 * doble conversión).
 */
interface PreordenRepository
{
    /**
     * Merge de líneas en la pre-orden de la reserva (upsert por
     * `plato_id`: la cantidad se reemplaza, no se acumula).
     *
     * @param  array<int, array{plato_id: int, cantidad: int}>  $lineas
     * @return Collection<int, DetallePreOrden>
     */
    public function guardar(Reserva $reserva, array $lineas): Collection;

    /**
     * Todas las líneas de la pre-orden de una reserva.
     *
     * @return Collection<int, DetallePreOrden>
     */
    public function deReserva(int $reservaId): Collection;

    /**
     * Líneas todavía NO convertidas (`pedido_id` null) de una reserva.
     *
     * @return Collection<int, DetallePreOrden>
     */
    public function pendientesDeReserva(int $reservaId): Collection;

    /**
     * Estampa el pedido real en todas las líneas pendientes de la
     * reserva (paso final de la conversión).
     */
    public function marcarConvertida(int $reservaId, int $pedidoId): void;

    /**
     * Borra la pre-orden completa de la reserva (carrito vacío).
     */
    public function borrarDeReserva(int $reservaId): void;

    public function find(int $id): ?DetallePreOrden;

    /**
     * @return Collection<int, DetallePreOrden>
     */
    public function all(): Collection;
}
