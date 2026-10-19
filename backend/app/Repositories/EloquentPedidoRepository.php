<?php

namespace App\Repositories;

use App\Models\Pedido;
use Illuminate\Support\Collection;

class EloquentPedidoRepository implements PedidoRepository
{
    /**
     * Estados finales (espejo de PedidoService::ESTADOS_FINALES).
     *
     * @var list<string>
     */
    private const FINALES = ['cerrado', 'cancelado'];

    public function conDetallesOrFail(int $id): Pedido
    {
        return Pedido::with('mesa', 'detalles.plato', 'detalles.promocion', 'detalles.ingredientes.ingrediente')
            ->findOrFail($id);
    }

    public function porId(int $id): ?Pedido
    {
        return Pedido::find($id);
    }

    public function crear(array $datos): Pedido
    {
        return Pedido::create($datos);
    }

    public function activosDeMesa(int $mesaId): Collection
    {
        return Pedido::where('mesa_id', $mesaId)
            ->whereNotIn('estado', self::FINALES)
            ->with('detalles.plato', 'detalles.promocion', 'detalles.ingredientes.ingrediente')
            ->orderBy('id')
            ->get();
    }

    public function hayActivosDeMesa(int $mesaId): bool
    {
        return Pedido::where('mesa_id', $mesaId)
            ->whereNotIn('estado', self::FINALES)
            ->exists();
    }

    public function pedidosDeVisita(int $mesaId, ?string $desde): Collection
    {
        return Pedido::where('mesa_id', $mesaId)
            ->where('estado', '!=', 'cancelado')
            ->when($desde !== null, fn ($q) => $q->where('fecha', '>=', $desde))
            ->with('detalles.plato', 'detalles.promocion', 'detalles.ingredientes.ingrediente')
            ->orderBy('id')
            ->get();
    }
}
