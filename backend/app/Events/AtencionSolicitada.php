<?php

namespace App\Events;

use App\Models\Mesa;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * LLAMADO DE ATENCIÓN del comensal al mozo ("llamar al mozo") desde
 * la mesa. Duplica el aviso: a los MOZOS (`empleado.atencion`, gate
 * `tomar_pedidos`) y a la propia mesa (`mesa.{id}`, el comensal ve la
 * confirmación de su pedido). `en` = timestamp ISO del llamado.
 */
class AtencionSolicitada implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public bool $afterCommit = true;

    public function __construct(public Mesa $mesa) {}

    /**
     * @return list<PrivateChannel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('empleado.atencion'),
            new PrivateChannel('mesa.'.$this->mesa->id),
        ];
    }

    public function broadcastAs(): string
    {
        return 'mesa.atencion';
    }

    /**
     * @return array{mesa_id: int, en: string}
     */
    public function broadcastWith(): array
    {
        return [
            'mesa_id' => $this->mesa->id,
            'en' => now()->toISOString(),
        ];
    }
}
