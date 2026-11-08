<?php

namespace Database\Factories;

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
            // Sin mesa: la reserva es un hold de inventario. `mesa_id`
            // es nullable y solo se llena en tests legados que lo
            // pasan a mano.
            'mesa_id' => null,
            'contacto_solicitante' => fake()->phoneNumber(),
            // PIN de 4 dígitos (string: los ceros a la izquierda
            // importan, igual que el codigo_acceso de las mesas).
            'codigo' => str_pad((string) fake()->unique()->numberBetween(0, 9999), 4, '0', STR_PAD_LEFT),
            'fecha' => now()->addDay()->toDateString(),
            // Mismo formato que guarda el service (H:i:s): el solape
            // de intervalos compara la hora exacta.
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
