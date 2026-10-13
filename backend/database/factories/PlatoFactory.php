<?php

namespace Database\Factories;

use App\Models\Categoria;
use App\Models\Plato;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Plato>
 */
class PlatoFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'categoria_id' => Categoria::factory(),
            'promocion_id' => null,
            'nombre' => fake()->unique()->words(3, true),
            'descripcion' => fake()->sentence(),
            'precio' => fake()->randomFloat(2, 1000, 20000),
            'imagen' => null,
            'disponible' => true,
        ];
    }
}
