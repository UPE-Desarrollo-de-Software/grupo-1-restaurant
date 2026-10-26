<?php

namespace App\Repositories;

use App\Models\Reserva;
use Illuminate\Support\Collection;

/**
 * Puerto de persistencia de RESERVAS (capa Repository).
 *
 * La lógica de negocio (lead time, disponibilidad de inventario,
 * solape de intervalos, transiciones) vive en ReservaService; acá solo
 * se persiste y se consultan los datos que esas reglas necesitan.
 */
interface ReservaRepository
{
    /**
     * Reserva por id con su mesa y su inventario cargados; lanza
     * ModelNotFoundException (404) si no existe.
     */
    public function porIdOrFail(int $id): Reserva;

    /**
     * @param  array<string, mixed>  $datos
     */
    public function crear(array $datos): Reserva;

    /**
     * Listado de reservas con filtros opcionales (estado, fecha,
     * mesa_id); siempre con mesa e inventario cargados.
     *
     * @return Collection<int, Reserva>
     */
    public function filtradas(?string $estado, ?string $fecha, ?int $mesaId): Collection;

    /**
     * Pendientes de una fecha con su inventario, con `lockForUpdate`
     * para serializar altas simultáneas (MySQL; no-op en SQLite de los
     * tests). La corre DENTRO de la transacción de alta, ANTES de
     * calcular disponibilidad, para que dos requests que llegan juntas
     * no agarren la misma capacidad libre.
     *
     * @return Collection<int, Reserva>
     */
    public function pendientesDeFecha(string $fecha): Collection;

    /**
     * Pendientes con fecha menor o igual a la indicada (incluye hoy):
     * las que ya vencieron pasan a `no_asistio` (ReservaService::
     * vencerVencidas).
     *
     * @return Collection<int, Reserva>
     */
    public function pendientesHastaFecha(string $fecha): Collection;

    /**
     * Reservas PENDIENTES de una mesa (legado: `mesa_id`; al destruir
     * una mesa se cancelan).
     *
     * @return Collection<int, Reserva>
     */
    public function pendientesDeMesa(int $mesaId): Collection;

    /**
     * Resumen del día (dashboard): conteo por estado de las reservas
     * de la fecha + suma de `cantPersonas` de las pendientes.
     *
     * @return array{por_estado: array<string, int>, total_personas_pendientes: int}
     */
    public function resumenDelDia(string $fecha): array;
}
