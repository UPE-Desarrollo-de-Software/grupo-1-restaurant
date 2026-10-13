<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * DETALLE_INGREDIENTE (DER v2.1) — tabla `detalle_pedido_ingrediente`.
 *
 * Registra un ingrediente excluido o agregado en una línea del pedido.
 * `precio_adicional` solo se guarda (y cobra) cuando `tipo = 'agregado'`;
 * excluir no modifica el precio (decisión del DER).
 */
class DetallePedidoIngrediente extends Model
{
    protected $table = 'detalle_pedido_ingrediente';

    protected $fillable = [
        'detalle_pedido_id',
        'ingrediente_id',
        'tipo',
        'precio_adicional',
    ];

    protected $casts = [
        'precio_adicional' => 'decimal:2',
    ];

    public function detallePedido(): BelongsTo
    {
        return $this->belongsTo(DetallePedido::class);
    }

    public function ingrediente(): BelongsTo
    {
        return $this->belongsTo(Ingrediente::class);
    }
}
