<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * DETALLE_PEDIDO (DER v2.2): una línea del pedido.
 *
 * `precio_lista` = precio unitario de catálogo del plato.
 * `subtotal`     = total de la línea (cantidad × (precio_lista + Σ
 *                  agregados) − descuento; el descuento se deriva hoy
 *                  en 0 hasta integrar el motor de promociones).
 * `promocion_id` = promo aplicada, congelada como histórico.
 * `confirmado`   = gate de envío por línea (antes en el pivot
 *                  cliente_detalle_pedido, borrado en el rebote 2).
 *                  Líneas del cliente nacen en false; las del mozo en
 *                  true. PedidoService::todasLasLineasConfirmadas()
 *                  cuenta las que sigan en false.
 */
class DetallePedido extends Model
{
    protected $fillable = [
        'pedido_id',
        'plato_id',
        'cantidad',
        'precio_lista',
        'subtotal',
        'promocion_id',
        'confirmado',
    ];

    protected $casts = [
        'precio_lista' => 'decimal:2',
        'subtotal' => 'decimal:2',
        'confirmado' => 'boolean',
    ];

    public function pedido(): BelongsTo
    {
        return $this->belongsTo(Pedido::class);
    }

    public function plato(): BelongsTo
    {
        return $this->belongsTo(Plato::class);
    }

    /**
     * Personalizaciones de la línea: ingredientes excluidos o
     * agregados (DER: DETALLE_INGREDIENTE).
     */
    public function ingredientes(): HasMany
    {
        return $this->hasMany(DetallePedidoIngrediente::class);
    }

    public function promocion(): BelongsTo
    {
        return $this->belongsTo(Promocion::class);
    }
}
