<?php

namespace Database\Seeders;

use App\Models\Parametro;
use Illuminate\Database\Seeder;

/**
 * PARAMETRO base del DER v2.2: el aforo del lugar.
 *
 * `capacidad_total` = cubiertos máximos del salón. Las mesas ya no se
 * precrean (rebote 2): cada mesa nueva consume aforo al crearse y lo
 * devuelve al destruirse.
 */
class ParametroSeeder extends Seeder
{
    public function run(): void
    {
        Parametro::updateOrCreate(
            ['clave' => 'capacidad_total'],
            ['valor' => '100'],
        );
    }
}
