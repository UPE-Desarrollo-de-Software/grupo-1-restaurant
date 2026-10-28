<?php

namespace App\Events;

use App\Models\Reserva;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * RESERVA CANCELADA (pendiente → cancelada) por cualquiera de los
 * caminos: empleado, cliente web o destrucción de la mesa. El payload
 * fija `estado = cancelada` (el modelo ya fue guardado antes de
 * emitir). Canal `empleado.reservas`.
 */
class ReservaCancelada implements ShouldBroadcast
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
        return 'reserva.cancelada';
    }

    /**
     * @return array{reserva_id: int, mesa_id: int|null, fecha: string, hora: string, estado: string}
     */
    public function broadcastWith(): array
    {
        return [
            'reserva_id' => $this->reserva->id,
            'mesa_id' => $this->reserva->mesa_id,
            'fecha' => $this->reserva->fecha,
            'hora' => $this->reserva->hora,
            'estado' => $this->reserva->estado,
        ];
    }
}
