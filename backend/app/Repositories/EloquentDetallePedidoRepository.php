<?php

namespace App\Repositories;

use App\Models\DetallePedido;
use App\Models\Pedido;

class EloquentDetallePedidoRepository implements DetallePedidoRepository
{
    public function crearLinea(Pedido $pedido, array $datos): DetallePedido
    {
        return $pedido->detalles()->create($datos);
    }

    public function crearPersonalizacion(DetallePedido $detalle, array $datos): void
    {
        $detalle->ingredientes()->create($datos);
    }

    public function marcarConfirmadas(int $pedidoId, ?array $detalleIds, bool $confirmado): int
    {
        return DetallePedido::where('pedido_id', $pedidoId)
            ->when($detalleIds !== null, fn ($q) => $q->whereIn('id', array_map('intval', $detalleIds)))
            ->update(['confirmado' => $confirmado]);
    }

    public function sinConfirmar(int $pedidoId): int
    {
        return DetallePedido::where('pedido_id', $pedidoId)
            ->where('confirmado', false)
            ->count();
    }
}
