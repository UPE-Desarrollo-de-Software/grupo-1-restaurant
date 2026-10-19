<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * RESERVA (DER v3.0).
 *
 * Sin `usuario_id` ni `nombre_solicitante` (no están en el DER v3.0);
 * `cantPersonas` es el nombre camelCase exacto del diagrama.
 * `estado`: pendiente | cancelada | finalizada | no_asistio.
 */
class Reserva extends Model
{
    use HasFactory;

    protected $fillable = [
        'mesa_id',
        'contacto_solicitante',
        'fecha',
        'hora',
        'cantPersonas',
        'estado',
    ];

    protected function casts(): array
    {
        return [
            // Sin cast 'date': el service normaliza a 'Y-m-d' y la
            // columna DATE de MySQL lo trunca igual. Con el cast,
            // Eloquent guardaría 'Y-m-d 00:00:00' y los WHERE por
            // fecha exacta (conflictos) no matchearían en SQLite.
            'cantPersonas' => 'integer',
        ];
    }

    public function mesa(): BelongsTo
    {
        return $this->belongsTo(Mesa::class);
    }
}
