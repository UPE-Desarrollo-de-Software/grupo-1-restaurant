<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * MESA (DER v2.1).
 *
 * `usuario_id`: mozo responsable (DER: USUARIO "atiende" MESA).
 * `codigo_mesa`: identificador visible de la mesa.
 * `estado`: libre | ocupada | reservada (valores del DER).
 *
 * El estado se sincroniza con los pedidos: abrir el primer pedido no
 * finalizado la pone 'ocupada'; cerrar/cancelar el último la devuelve
 * a 'libre' (ver PedidoService).
 */
class Mesa extends Model
{
    use HasFactory;

    protected $table = 'mesas';

    protected $fillable = [
        'usuario_id',
        'codigo_mesa',
        'capacidad',
        'estado',
        'qr',
    ];

    // ==================== RELACIONES ====================

    /**
     * Mozo responsable de la mesa.
     */
    public function mozo(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'usuario_id');
    }

    /**
     * Pedidos que se generaron en esta mesa (DER: MESA "genera" PEDIDO).
     */
    public function pedidos(): HasMany
    {
        return $this->hasMany(Pedido::class);
    }

    /**
     * Relación con sesiones — ENTIDAD CONGELADA: la tabla `mesa_sesion`
     * se conserva por si vuelve el flujo de sesiones, pero ya no
     * participa en el modelo activo del DER v2.1.
     */
    public function sesiones(): BelongsToMany
    {
        return $this->belongsToMany(Sesion::class, 'mesa_sesion', 'mesaID', 'sesionID');
    }

    // ==================== MÉTODOS ÚTILES ====================

    public function Reservar(): void
    {
        $this->update([
            'estado' => 'reservada',
        ]);
    }

    public function estaReservada(): bool
    {
        return $this->estado === 'reservada';
    }

    public function expirarReserva(): void
    {
        $this->update([
            'estado' => 'libre',
        ]);
    }

    /**
     * Estado final (cerrado/cancelado) de un pedido: libera la mesa.
     */
    public function liberar(): void
    {
        $this->update([
            'estado' => 'libre',
        ]);
    }

    /**
     * El primer pedido no finalizado ocupa la mesa.
     */
    public function ocupar(): void
    {
        $this->update([
            'estado' => 'ocupada',
        ]);
    }
}
