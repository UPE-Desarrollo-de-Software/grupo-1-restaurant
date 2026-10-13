<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * SESION — ENTIDAD CONGELADA (fuera del DER v2.1).
 *
 * El DER v2.1 eliminó SESION / MESA_SESION / CLIENTES. El modelo se
 * conserva por decisión del equipo (la funcionalidad podría volver en
 * otra entidad), pero está desconectado del flujo activo: no tiene
 * rutas ni participa en Pedidos (PEDIDO cuelga de MESA.mesa_id).
 * Ver documentacion/DER-v2.1-backend.md.
 */
class Sesion extends Model
{
    use HasFactory;

    protected $table = 'sesiones';

    protected $fillable = [
        'mozoID',
        'codigoGrupal',
        'inicio',
        'fin',
        'estado',
    ];

    protected $casts = [
        'inicio' => 'datetime',
        'fin' => 'datetime',
    ];

    // ==================== RELACIONES ====================

    public function mozo()
    {
        return $this->belongsTo(Usuario::class, 'mozoID');
    }

    public function mesas()
    {
        return $this->belongsToMany(Mesa::class, 'mesa_sesion', 'sesionID', 'mesaID');
    }

    public function clientes()
    {
        return $this->hasMany(Cliente::class, 'sesionID');
    }

    // Nota: la relación pedidos() se eliminó porque PEDIDO ya no tiene
    // sesion_id (ahora cuelga de mesa_id, fiel al DER v2.1).

    // ==================== MÉTODOS ÚTILES ====================

    public function estaActiva(): bool
    {
        return $this->estado === 'activa';
    }

    public function cerrar(): void
    {
        $this->update([
            'estado' => 'cerrada',
            'fin' => now(),
        ]);
    }

    public function expirar(): void
    {
        $this->update([
            'estado' => 'expirada',
            'fin' => now(),
        ]);
    }
}
