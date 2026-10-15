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
            // Único código de la mesa (6 dígitos STRING, nace con ella).
            'codigo_acceso' => (string) fake()->unique()->numberBetween(100000, 999999),
            'capacidad' => 4,
            'estado' => 'libre',
        ];
    }
}
