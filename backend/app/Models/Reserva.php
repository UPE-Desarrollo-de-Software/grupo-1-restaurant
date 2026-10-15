<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * RESERVA (DER v2.2).
 *
 * Sin `sesion_id` (la entidad SESION se eliminó del DER).
 * `nombre_solicitante` / `contacto_solicitante` son los nombres del
 * DER dibujado (antes nombre_cliente / telefono_cliente).
 * `usuario_id`: mozo que toma la reserva.
 */
class Reserva extends Model
{
    protected $fillable = [
        'mesa_id',
        'usuario_id',
        'nombre_solicitante',
        'contacto_solicitante',
        'fecha',
        'hora',
        'cant_personas',
        'estado',
    ];

    public function mesa(): BelongsTo
    {
        return $this->belongsTo(Mesa::class);
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(Usuario::class);
    }
}
