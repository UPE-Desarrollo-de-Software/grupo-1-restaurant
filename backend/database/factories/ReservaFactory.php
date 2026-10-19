<?php

namespace Database\Factories;

use App\Models\Mesa;
use App\Models\Reserva;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Reserva>
 */
class ReservaFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'mesa_id' => Mesa::factory(),
            'contacto_solicitante' => fake()->phoneNumber(),
            'fecha' => now()->addDay()->toDateString(),
            // Mismo formato que guarda el service (H:i:s): el conflicto
            // compara la hora exacta.
            'hora' => '20:00:00',
            'cantPersonas' => 2,
            'estado' => 'pendiente',
        ];
    }

    public function confirmadaFinalizada(): static
    {
        return $this->state(fn () => ['estado' => 'finalizada']);
    }

    public function cancelada(): static
    {
        return $this->state(fn () => ['estado' => 'cancelada']);
    }
}
