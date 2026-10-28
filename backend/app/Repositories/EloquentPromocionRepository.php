<?php

namespace App\Repositories;

use App\Models\Promocion;
use Illuminate\Support\Collection;

class EloquentPromocionRepository implements PromocionRepository
{
    private const FINALES = ['cerrado', 'cancelado'];

    public function listar(): Collection
    {
        return Promocion::all();
    }

    public function porId(int $id): Promocion
    {
        return Promocion::findOrFail($id);
    }

    public function crear(array $datos): Promocion
    {
        return Promocion::create($datos);
    }

    public function actualizar(Promocion $promocion, array $datos): Promocion
    {
        $promocion->update($datos);

        return $promocion;
    }

    public function eliminar(Promocion $promocion): void
    {
        $promocion->delete();
    }

    /**
     * ¿Se aplicó ya esta promo en líneas de pedido? (histórico: el
     * descuento congelado en detalle_pedidos referencia la promo).
     */
    public function tieneDetalleHistorico(Promocion $promo): bool
    {
        return $promo->detalles()->exists();
    }

    /**
     * Líneas que usan esta promo y están en pedidos NO finales
     * (los cerrados/cancelados son intocables: su subtotal es histórico).
     *
     * @return Collection<int, DetallePedido> con 'pedido' e 'ingredientes' cargados
     */
    public function detallesAplicadosEnPedidosNoFinales(Promocion $promo): Collection
    {
        return $promo->detalles()
            ->with('pedido', 'ingredientes')
            ->whereHas('pedido', fn ($q) => $q->whereNotIn('estado', self::FINALES))
            ->get();
    }
}
