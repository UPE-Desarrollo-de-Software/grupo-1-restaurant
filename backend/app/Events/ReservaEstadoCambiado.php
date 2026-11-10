<?php

namespace App\Events;

use App\Models\Reserva;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * CAMBIO DE ESTADO DE RESERVA (fuera de la alta y de la cancelación,
 * que siguen con sus eventos propios): llegada (`finalizada`),
 * inasistencia manual (`no_asistio`) y vencimiento automático de la
 * espera (también `no_asistio`). `afterCommit` difiere el push hasta
 * el commit. Canal `empleado.reservas`.
 *
 * `mesa_id` es legacy (nullable): se manda igual por compatibilidad
 * con el contrato.
 */
class ReservaEstadoCambiado implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public bool $afterCommit = true;

    public function __construct(
        public Reserva $reserva,
        public string $estadoAnterior,
    ) {}

    /**
     * @return list<PrivateChannel>
     */
    public function broadcastOn(): array
    {
        return [new PrivateChannel('empleado.reservas')];
    }

    public function broadcastAs(): string
    {
        return 'reserva.estado';
    }

    /**
     * @return array{reserva_id: int, mesa_id: int|null, fecha: string, hora: string, estado: string, estado_anterior: string}
     */
    public function broadcastWith(): array
    {
        return [
            'reserva_id' => $this->reserva->id,
            'mesa_id' => $this->reserva->mesa_id,
            'fecha' => $this->reserva->fecha,
            'hora' => $this->reserva->hora,
            'estado' => $this->reserva->estado,
            'estado_anterior' => $this->estadoAnterior,
        ];
    }
}
