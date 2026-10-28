<?php

namespace App\Events;

use App\Models\Pedido;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * TRANSICIÓN de estado de un pedido (confirmar, enviar, avanzar por el
 * flujo, cancelar, deshacer). El evento lleva el estado ANTERIOR para
 * que el front pueda validar/diferenciar la transición.
 *
 * Se emite dentro de la transacción del cambio; `afterCommit` difiere
 * el push hasta el commit. Canal `empleado.pedidos` (cocina + mozos).
 */
class PedidoEstadoCambiado implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public bool $afterCommit = true;

    public function __construct(
        public Pedido $pedido,
        public string $estadoAnterior,
    ) {}

    /**
     * @return list<PrivateChannel>
     */
    public function broadcastOn(): array
    {
        return [new PrivateChannel('empleado.pedidos')];
    }

    public function broadcastAs(): string
    {
        return 'pedido.estado';
    }

    /**
     * @return array{pedido_id: int, mesa_id: int, estado: string, estado_anterior: string}
     */
    public function broadcastWith(): array
    {
        return [
            'pedido_id' => $this->pedido->id,
            'mesa_id' => $this->pedido->mesa_id,
            'estado' => $this->pedido->estado,
            'estado_anterior' => $this->estadoAnterior,
        ];
    }
}
