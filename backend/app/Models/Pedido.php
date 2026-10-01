<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Pedido extends Model
{
    protected $fillable = [
        'sesion_id',
        'estado',
        'total',
        'fecha',
        'cliente_id',
    ];

    public function detalles(): HasMany
    {
        return $this->hasMany(DetallePedido::class);
    }

    public function cliente()
    {
        return $this->belongsTo(Cliente::class);
    }
}
