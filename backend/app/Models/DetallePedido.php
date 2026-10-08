<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;


class DetallePedido extends Model
{
    protected $fillable = [
        'pedido_id',
        'producto_id',
        'cantidad',
        'precio_lista',
        'precio_final',
        'promocion_id'
    ];

    protected $casts = [
        'precio_lista' => 'decimal:2',
        'precio_final' => 'decimal:2',
    ];

    public function pedido(): BelongsTo
    {
        return $this->belongsTo(Pedido::class);
    }

    public function producto(): BelongsTo
    {
        return $this->belongsTo(Producto::class);
    }

    public function ingredientes(): HasMany
    {
        return $this->hasMany(DetallePedidoIngrediente::class);
    }

    public function promocion(): BelongsTo
    {
        return $this->belongsTo(Promocion::class);
    }
}
