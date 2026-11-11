<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * LÍNEA DE PRE-ORDEN (entidad nueva fuera del DER v3.0).
 *
 * 1 fila por plato del carrito de la reserva (`unique` en
 * [reserva_id, plato_id]). `pedido_id` NULL = pendiente de convertir:
 * al llegar el cliente se estampa con el pedido real que nace en la
 * mesa principal (evita la doble conversión). No guarda precios: se
 * calculan al convertir.
 */
class DetallePreOrden extends Model
{
    protected $table = 'detalle_preorden';

    protected $fillable = [
        'reserva_id',
        'plato_id',
        'cantidad',
        'pedido_id',
    ];

    public function plato(): BelongsTo
    {
        return $this->belongsTo(Plato::class);
    }

    public function reserva(): BelongsTo
    {
        return $this->belongsTo(Reserva::class);
    }

    /**
     * Pedido en el que terminó esta línea (null mientras sigue
     * pendiente de convertir).
     */
    public function pedido(): BelongsTo
    {
        return $this->belongsTo(Pedido::class);
    }
}
