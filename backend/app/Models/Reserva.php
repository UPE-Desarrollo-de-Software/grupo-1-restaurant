<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * RESERVA (DER v3.0).
 *
 * Sin `usuario_id` ni `nombre_solicitante` (no están en el DER v3.0);
 * `cantPersonas` es el nombre camelCase exacto del diagrama.
 * `estado`: pendiente | cancelada | finalizada | no_asistio.
 *
 * La reserva NO es una mesa: es un HOLD sobre el inventario del salón.
 * Al crearla se calcula la combinación de capacidades que aloja a los
 * N pedidos y se persiste en `reserva_inventario` (`inventario()`).
 * `mesa_id` quedó nullable SIN USO: la mesa física la arma el mozo
 * cuando llega el cliente y a partir de ahí se comporta como cualquier
 * otra mesa.
 */
class Reserva extends Model
{
    use HasFactory;

    /**
     * Duración del hold (espera del cliente): [hora, hora + 30 min].
     * Fuente única de la regla: la usan ReservaService (disponibilidad,
     * vencimiento) y MesaService (aforo efectivo del salón).
     */
    public const ESPERA_MIN = 30;

    protected $fillable = [
        'mesa_id', // legacy: nullable y sin uso en el alta nueva
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
            // fecha exacta no matchearían en SQLite.
            'cantPersonas' => 'integer',
        ];
    }

    /**
     * Mesa física (solo reservas legadas con `mesa_id`; las nuevas no
     * apuntan a ninguna).
     */
    public function mesa(): BelongsTo
    {
        return $this->belongsTo(Mesa::class);
    }

    /**
     * Capacidades que esta reserva toma del inventario del salón.
     *
     * @return HasMany<int, ReservaInventario>
     */
    public function inventario(): HasMany
    {
        return $this->hasMany(ReservaInventario::class);
    }

    /**
     * ¿El hold de esta reserva contiene al minuto $minutos desde
     * 00:00 del mismo día?
     *
     * `$margenAntes` extiende la protección hacia atrás (usado por
     * MesaService: una mesa nueva no puede comerse el cupo de una
     * reserva desde M minutos antes de su hora, no solo durante el
     * hold [hora, hora + ESPERA_MIN)).
     */
    public function holdContieneMinuto(int $minutos, int $margenAntes = 0): bool
    {
        [$hora, $minuto] = explode(':', $this->hora);
        $inicio = ((int) $hora) * 60 + (int) $minuto;

        return $minutos >= $inicio - $margenAntes && $minutos < $inicio + self::ESPERA_MIN;
    }
}
