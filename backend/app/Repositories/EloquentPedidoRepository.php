<?php

namespace App\Repositories;

use App\Models\DetallePedido;
use App\Models\Pedido;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

class EloquentPedidoRepository implements PedidoRepository
{
    /**
     * Estados finales del DER (cerrado/cancelado): no admiten cambios
     * ni agregados; la visita se cierra con el pago, no con el pedido.
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

    public function ventasEntre(string $desde, string $hasta, array $estados): array
    {
        $fila = Pedido::query()
            ->whereIn('estado', $estados)
            ->whereBetween('fecha', ["{$desde} 00:00:00", "{$hasta} 23:59:59"])
            ->selectRaw('count(*) as cantidad, coalesce(sum(total), 0) as total')
            ->first();

        return [
            'cantidad' => (int) $fila->cantidad,
            'total' => (float) $fila->total,
        ];
    }

    public function porEstadoEntre(string $desde, string $hasta): array
    {
        return Pedido::query()
            ->whereBetween('fecha', ["{$desde} 00:00:00", "{$hasta} 23:59:59"])
            ->selectRaw('estado, count(*) as cantidad')
            ->groupBy('estado')
            ->pluck('cantidad', 'estado')
            ->map(fn ($cantidad) => (int) $cantidad)
            ->all();
    }

    public function platosMasVendidos(string $desde, string $hasta, array $estados, int $limite = 10): Collection
    {
        return DetallePedido::query()
            ->join('pedidos', 'pedidos.id', '=', 'detalle_pedidos.pedido_id')
            ->join('platos', 'platos.id', '=', 'detalle_pedidos.plato_id')
            ->whereIn('pedidos.estado', $estados)
            ->whereBetween('pedidos.fecha', ["{$desde} 00:00:00", "{$hasta} 23:59:59"])
            ->groupBy('platos.id', 'platos.nombre')
            ->selectRaw('platos.id as plato_id, platos.nombre, sum(detalle_pedidos.cantidad) as unidades, sum(detalle_pedidos.subtotal) as total')
            ->orderByDesc('unidades')
            ->limit($limite)
            ->get();
    }

    public function historialPaginado(?string $desde, ?string $hasta, ?string $estado, ?int $mesaId, int $pagina, int $porPagina): LengthAwarePaginator
    {
        return Pedido::query()
            ->with(['mesaHistorial', 'detalles.plato', 'detalles.promocion'])
            ->when($estado !== null,
                fn ($q) => $q->where('estado', $estado),
                // Sin filtro: es un historial → solo finalizados.
                fn ($q) => $q->whereIn('estado', self::FINALES))
            ->when($desde !== null, fn ($q) => $q->where('fecha', '>=', "{$desde} 00:00:00"))
            ->when($hasta !== null, fn ($q) => $q->where('fecha', '<=', "{$hasta} 23:59:59"))
            ->when($mesaId !== null, fn ($q) => $q->where('mesa_id', $mesaId))
            ->orderByDesc('fecha')
            ->orderByDesc('id')
            ->paginate($porPagina, ['*'], 'page', $pagina);
    }

    public function conDetallesYTrashedOrFail(int $id): Pedido
    {
        return Pedido::with(['mesaHistorial', 'detalles.plato', 'detalles.promocion'])
            ->findOrFail($id);
    }
}
