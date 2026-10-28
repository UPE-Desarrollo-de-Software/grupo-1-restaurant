<?php

namespace App\Events;

use App\Models\Reserva;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * RESERVA NUEVA (estado `pendiente`): alta de empleado o del cliente
 * web. Se emite dentro de la transacción del hold; `afterCommit`
 * difiere el push hasta el commit. Canal `empleado.reservas`.
 *
 * `mesa_id` es legacy (nullable, sin uso en el alta nueva): se manda
 * igual para no romper el contrato del front.
 */
class ReservaCreada implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public bool $afterCommit = true;

    public function __construct(public Reserva $reserva) {}

    /**
     * @return list<PrivateChannel>
     */
    public function broadcastOn(): array
    {
        return [new PrivateChannel('empleado.reservas')];
    }

    public function broadcastAs(): string
    {
        return 'reserva.creada';
    }

    /**
     * @return array{reserva_id: int, mesa_id: int|null, fecha: string, hora: string, cantPersonas: int, estado: string}
     */
    public function broadcastWith(): array
    {
        return [
            'reserva_id' => $this->reserva->id,
            'mesa_id' => $this->reserva->mesa_id,
            'fecha' => $this->reserva->fecha,
            'hora' => $this->reserva->hora,
            'cantPersonas' => $this->reserva->cantPersonas,
            'estado' => $this->reserva->estado,
        ];
    }
}
