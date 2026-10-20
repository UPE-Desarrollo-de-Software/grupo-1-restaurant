<?php

namespace Database\Seeders;

use App\Models\ConfigMesa;
use Illuminate\Database\Seeder;

/**
 * CONFIG_MESA base: 25 mesas de 4 cubiertos (aforo 100).
 *
 * Es el equivalente al viejo PARAMETRO `capacidad_total = 100`, pero
 * expresado como composición del salón. Idempotente con semántica de
 * replace-all: deja exactamente una fila 25×4.
 */
class ConfigMesaSeeder extends Seeder
{
    public function run(): void
    {
        ConfigMesa::query()->delete();

        ConfigMesa::create([
            'cantidad' => 25,
            'capacidad' => 4,
        ]);
    }
}
