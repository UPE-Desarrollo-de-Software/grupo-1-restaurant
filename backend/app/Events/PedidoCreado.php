<?php

namespace App\Events;

use App\Models\Pedido;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * PEDIDO NUEVO (raíz o hijo) recién creado en `en_curso`.
 *
 * Se emite dentro de la transacción de alta; `afterCommit` difiere el
 * push a la cola hasta el commit. Canal único para cocina y mozos
 * (`empleado.pedidos`).
 */
class PedidoCreado implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public bool $afterCommit = true;

    public function __construct(public Pedido $pedido) {}

    /**
     * @return list<PrivateChannel>
     */
    public function broadcastOn(): array
    {
        return [new PrivateChannel('empleado.pedidos')];
    }

    public function broadcastAs(): string
    {
        return 'pedido.creado';
    }

    /**
     * @return array{pedido_id: int, mesa_id: int, estado: string}
     */
    public function broadcastWith(): array
    {
        return [
            'pedido_id' => $this->pedido->id,
            'mesa_id' => $this->pedido->mesa_id,
            'estado' => $this->pedido->estado,
        ];
    }
}
