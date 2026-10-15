<?php

namespace App\Repositories;

use App\Models\Promocion;
use Illuminate\Support\Collection;

class EloquentPromocionRepository implements PromocionRepository
{
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
}
