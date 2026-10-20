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
     * PARAMETRO.capacidad_total valida el aforo del lugar.
     */
    public function capacidadOcupada(): int;

    /**
     * ¿Ya existe una mesa viva (o destruida) con ese código? (el
     * unique de la BD es la última línea de defensa; esto evita la
     * QueryException generando códigos).
     */
    public function codigoExiste(string $codigo): bool;

    /**
     * Código de acceso libre: 4 dígitos, generado al crear la mesa y
     * único entre todas las filas.
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
}
