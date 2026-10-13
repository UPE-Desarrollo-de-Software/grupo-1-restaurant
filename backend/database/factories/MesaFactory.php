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
            'codigo_mesa' => fake()->unique()->numberBetween(1, 9999),
            'capacidad' => 4,
            'estado' => 'libre',
            'qr' => null,
        ];
    }
}
