<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * PROMOCION (DER v2.2).
 *
 * Se eliminaron `ambito` y `condiciones` (y las tablas
 * `promocion_categoria` / `promocion_producto`) para ser fieles al
 * DER: el alcance lo dan
 *  - `platos.promocion_id`   → oferta vigente en la carta (catálogo), y
 *  - `detalle_pedidos.promocion_id` → descuento congelado (histórico).
 */
class Promocion extends Model
{
    // La pluralización en inglés daría "promocions": la tabla es la del DER.
    protected $table = 'promociones';

    protected $fillable = [
        'nombre',
        'tipo',
        'valor',
        'fecha_inicio',
        'fecha_fin',
        'activo',
    ];

    protected $casts = [
        'fecha_inicio' => 'datetime',
        'fecha_fin' => 'datetime',
        'activo' => 'boolean',
    ];

    /**
     * Platos que tienen esta promo como oferta vigente en la carta
     * (FK en platos.promocion_id: 1 promo : 0..N platos).
     */
    public function platos(): HasMany
    {
        return $this->hasMany(Plato::class);
    }

    /**
     * Líneas de pedido donde se aplicó esta promo (histórico).
     */
    public function detalles(): HasMany
    {
        return $this->hasMany(DetallePedido::class);
    }
}
