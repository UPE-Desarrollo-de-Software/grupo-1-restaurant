<?php

namespace App\Repositories;

use App\Models\ConfigMesa;
use Illuminate\Support\Collection;

/**
 * Puerto de persistencia de CONFIG_MESA (capa Repository).
 *
 * La tabla describe el POTENCIAL del salón ("hay N mesas de M
 * cubiertos"); de ahí salen los dos límites que valida
 * MesaService::crearMesa: el AFORO (Σ capacidad×cantidad) y el tope
 * de MESAS (Σ cantidad). Reemplaza a ParametroRepository.
 */
interface ConfigMesaRepository
{
    /**
     * Filas de la composición del salón.
     *
     * @return Collection<int, ConfigMesa>
     */
    public function filas(): Collection;

    /**
     * AFORO del lugar: Σ(capacidad × cantidad). Default defensivo
     * 100 si la tabla está vacía (equivalente al seed 25×4).
     */
    public function aforo(): int;

    /**
     * Tope de mesas vivas: Σ cantidad. Default defensivo 25 si la
     * tabla está vacía.
     */
    public function cantidadMaximaMesas(): int;

    /**
     * REPLACE-ALL: borra las filas y guarda las nuevas (atómico).
     * Las reglas de negocio (aforo vs ocupada, tope vs vivas) las
     * valida ConfiguracionService antes de llamar acá.
     *
     * @param  list<array{cantidad: int, capacidad: int}>  $filas
     */
    public function reemplazar(array $filas): void;
}
