<?php

namespace Database\Factories;

use App\Models\Mesa;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Mesa>
 */
class MesaFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'usuario_id' => null,
            // Único código de la mesa (4 dígitos STRING, nace con ella).
            'codigo_acceso' => str_pad((string) fake()->unique()->numberBetween(0, 9999), 4, '0', STR_PAD_LEFT),
            'capacidad' => 4,
            'estado' => 'libre',
        ];
    }
}
