<?php

namespace App\Services;

use App\Repositories\MesaRepository;
use App\Repositories\ParametroRepository;

/**
 * Configuración del restaurante (tabla PARAMETRO, DER v2.2).
 *
 * Hoy solo se usa el aforo `capacidad_total`, pero el service está
 * preparado para cualquier clave/valor que el DER agregue después.
 */
class ConfiguracionService
{
    public function __construct(
        private ParametroRepository $parametros,
        private MesaRepository $mesas,
    ) {}

    /**
     * @return array{capacidad_total: int}
     */
    public function obtener(): array
    {
        return [
            'capacidad_total' => $this->parametros->capacidadTotal(),
        ];
    }

    /**
     * @param  array<string, mixed>  $datos  {capacidad_total?: int}
     *
     * @throws \Exception si el aforo nuevo queda por debajo de lo ya
     *                    ocupado por las mesas vivas
     */
    public function actualizar(array $datos): array
    {
        if (array_key_exists('capacidad_total', $datos)) {
            $nuevo = (int) $datos['capacidad_total'];
            $ocupada = $this->mesas->capacidadOcupada();

            if ($nuevo < $ocupada) {
                throw new \Exception(
                    "No se puede bajar el aforo a {$nuevo}: las mesas vivas ya ocupan {$ocupada}."
                );
            }

            $this->parametros->establecer('capacidad_total', (string) $nuevo);
        }

        return $this->obtener();
    }
}
