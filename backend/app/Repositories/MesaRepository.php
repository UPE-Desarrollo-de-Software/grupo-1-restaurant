<?php

namespace App\Repositories;

use App\Models\Mesa;
use Illuminate\Support\Collection;

/**
 * Puerto de persistencia de MESAS (capa Repository).
 *
 * Todas las lecturas respetan el SoftDeletes: una mesa destruida no
 * aparece. Las que necesitan ver el histórico (cuenta/resumen de una
 * visita terminada) usan los métodos explícitos con trashed.
 */
interface MesaRepository
{
    /**
     * Mesas vivas (el scope global de SoftDeletes las excluye).
     *
     * @return Collection<int, Mesa>
     */
    public function todas(): Collection;

    /**
     * Mesas vivas en estado 'libre'.
     *
     * @return Collection<int, Mesa>
     */
    public function disponibles(): Collection;

    /**
     * Mesa viva por id; null si no existe (o fue destruida).
     */
    public function porId(int $id): ?Mesa;

    /**
     * Mesa viva por id; lanza ModelNotFoundException (404) si no
     * existe o fue destruida.
     */
    public function porIdOrFail(int $id): Mesa;

    /**
     * Mesa por id sin importar si fue destruida (consultas de
     * histórico: cuenta/resumen de la visita terminada);
     * lanza ModelNotFoundException si no existe en absoluto.
     */
    public function conTrashedOrFail(int $id): Mesa;

    /**
     * Resuelve la mesa por su código de acceso (middleware del
     * cliente / POST /api/acceso). Solo mesas vivas: el código de una
     * mesa destruida deja de valer.
     */
    public function porCodigo(string $codigo): ?Mesa;

    /**
     * @param  array<string, mixed>  $datos
     */
    public function crear(array $datos): Mesa;

    /**
     * Suma de las capacidades de TODAS las mesas vivas: contra
     * CONFIG_MESA (aforo = Σ capacidad×cantidad) valida el aforo del
     * lugar.
     */
    public function capacidadOcupada(): int;

    /**
     * Candidato de código de acceso: 6 dígitos. La unicidad no se
     * consulta acá: el service inserta y reintenta si el UNIQUE de
     * `codigo_acceso` choca (una consulta previa no cubre la carrera
     * entre dos altas simultáneas).
     */
    public function nuevoCodigoAcceso(): string;

    /**
     * Mesas vivas del grupo de lectura (excluyendo una).
     *
     * @param  list<int>  $excluirIds
     * @return Collection<int, Mesa>
     */
    public function porGrupo(int $grupoCodigo, array $excluirIds = []): Collection;

    /**
     * Mesas vivas por lista de ids (validación de agrupar/desagrupar).
     *
     * @param  list<int>  $ids
     * @return Collection<int, Mesa>
     */
    public function porIds(array $ids): Collection;

    public function eliminar(Mesa $mesa): void;

    /**
     * Conteo de mesas vivas por estado (dashboard): solo los estados
     * presentes; el service rellena los faltantes con 0.
     *
     * @return array<string, int>
     */
    public function cantidadPorEstado(): array;
}
