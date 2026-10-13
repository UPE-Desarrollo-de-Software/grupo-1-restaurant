<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * PEDIDO (DER v2.1): cuenta de una mesa.
 *
 * Cuelga de MESA (no de sesión ni de cliente: esas entidades se
 * eliminaron del DER). El mozo responsable se deriva por
 * PEDIDO → MESA → USUARIO. Regla del DER: a lo sumo 1 pedido
 * no-finalizado por mesa (la valida PedidoService).
 */
class Pedido extends Model
{
    protected $fillable = [
        'mesa_id',
        'estado',
        'total',
        'fecha',
    ];

    public function mesa(): BelongsTo
    {
        return $this->belongsTo(Mesa::class);
    }

    public function detalles(): HasMany
    {
        return $this->hasMany(DetallePedido::class);
    }

    /**
     * Estados finales: liberan la mesa y no admiten cambios.
     */
    public function estaFinalizado(): bool
    {
        return in_array($this->estado, ['cerrado', 'cancelado'], true);
    }
}
