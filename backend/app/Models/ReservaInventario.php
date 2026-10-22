<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * RESERVA_INVENTARIO (reserva_inventario): cantidades asignadas por
 * CAPACIDAD a una reserva.
 *
 * `CONFIG_MESA` guarda el POTENCIAL del salón (hay N mesas de M
 * cubiertos) y no tiene identificadores de mesas físicas, así que la
 * reserva se registra en el mismo lenguaje: "esta reserva toma 1 mesa
 * de 4 y 1 de 2". De ahí se calcula la disponibilidad del horario
 * (CONFIG_MESA − holds pendientes solapados).
 *
 * Unique (reserva_id, capacidad): cada capacidad aparece una sola vez
 * por reserva (la cantidad está en `cantidad`).
 */
class ReservaInventario extends Model
{
    protected $table = 'reserva_inventario';

    protected $fillable = ['reserva_id', 'capacidad', 'cantidad'];

    protected function casts(): array
    {
        return [
            'capacidad' => 'integer',
            'cantidad' => 'integer',
        ];
    }

    /**
     * Reserva a la que pertenece este hold de inventario.
     */
    public function reserva(): BelongsTo
    {
        return $this->belongsTo(Reserva::class);
    }
}
