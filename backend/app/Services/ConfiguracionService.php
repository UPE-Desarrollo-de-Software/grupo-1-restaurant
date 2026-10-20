<?php

namespace App\Services;

use App\Models\ConfigMesa;
use App\Repositories\ConfigMesaRepository;
use App\Repositories\MesaRepository;

/**
 * Configuración del restaurante (tabla CONFIG_MESA, DER del grupo).
 *
 * El salón se describe como composición de piezas: "hay `cantidad`
 * mesas de `capacidad` cubiertos". De ahí se derivan los dos límites
 * que valida MesaService:
 *
 *   aforo          = Σ(capacidad × cantidad)  → cubiertos máximos
 *   mesas_maximas  = Σ cantidad                → mesas vivas máximas
 *
 * PUT /api/configuracion es REPLACE-ALL: se borran las filas y se
 * guardan las nuevas (ConfigMesaRepository::reemplazar).
 */
class ConfiguracionService
{
    public function __construct(
        private ConfigMesaRepository $configMesas,
        private MesaRepository $mesas,
    ) {}

    /**
     * @return array{config_mesas: list<array{cantidad: int, capacidad: int}>, aforo: int, mesas_maximas: int}
     */
    public function obtener(): array
    {
        return [
            'config_mesas' => $this->configMesas->filas()
                ->map(fn (ConfigMesa $fila) => [
                    'cantidad' => (int) $fila->cantidad,
                    'capacidad' => (int) $fila->capacidad,
                ])
                ->values()
                ->all(),
            'aforo' => $this->configMesas->aforo(),
            'mesas_maximas' => $this->configMesas->cantidadMaximaMesas(),
        ];
    }

    /**
     * REPLACE-ALL de la composición. Reglas previas al guardado:
     *  - el aforo nuevo no puede quedar por debajo de la capacidad
     *    que ya ocupan las mesas vivas;
     *  - el tope de mesas (Σ cantidad) no puede quedar por debajo de
     *    las mesas vivas.
     *
     * @param  array{config_mesas: list<array{cantidad: int, capacidad: int}>}  $datos
     *
     * @throws \Exception si alguna de las dos reglas se viola
     */
    public function actualizar(array $datos): array
    {
        $filas = $datos['config_mesas'];

        $aforoNuevo = (int) array_sum(
            array_map(fn (array $fila) => $fila['capacidad'] * $fila['cantidad'], $filas)
        );
        $ocupada = $this->mesas->capacidadOcupada();

        if ($aforoNuevo < $ocupada) {
            throw new \Exception(
                "No se puede bajar el aforo a {$aforoNuevo}: las mesas vivas ya ocupan {$ocupada}."
            );
        }

        $maxMesas = (int) array_sum(array_column($filas, 'cantidad'));
        $vivas = $this->mesas->todas()->count();

        if ($maxMesas < $vivas) {
            throw new \Exception(
                "No se puede bajar la cantidad de mesas a {$maxMesas}: hay {$vivas} mesas vivas."
            );
        }

        $this->configMesas->reemplazar($filas);

        return $this->obtener();
    }
}
