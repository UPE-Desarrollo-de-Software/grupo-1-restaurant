<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DetallePedidoIngrediente extends Model
{
    protected $table = 'detalle_pedido_ingrediente';

    protected $fillable = [
        'detalle_pedido_id',
        'ingrediente_id',
        'precio_adicional',
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
