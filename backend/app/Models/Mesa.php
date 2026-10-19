<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * MESA (DER v2.2: entidad dinámica).
 *
 * `usuario_id`: mozo responsable (DER: USUARIO "atiende" MESA).
 * `codigo_acceso`: ÚNICO código de la mesa, nace con ella (6 dígitos,
 *   lo genera el mozo o el sistema al crearla) y no
 *   cambia nunca: es la credencial del cliente (Authorization:
 *   Bearer {codigo_acceso}) hasta que la mesa se destruye.
 * `ocupada_desde`: corte de la cuenta de la visita.
 * `grupo_codigo`: agrupación de lectura para varias mesas (no es FK).
 * `estado`: libre | ocupada | reservada (valores del DER).
 * `deleted_at`: borrado LÓGICO = "destrucción" de la mesa (decisión
 *   del rebote 2 con los profes): los pedidos históricos conservan su
 *   FK cascade hacia acá (las ventas no se borran) y para la app la
 *   mesa deja de existir (listados, aforo y validación por código la
 *   ignoran).
 *
 * Ciclo de vida: la crea el mozo (POST /mesas) o el sistema al
 * reservar por la web ("mozo virtual"), el primer pedido la pone
 * 'ocupada' y destruirla (DELETE o cierre del último pedido) la saca
 * de circulación.
 */
class Mesa extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $table = 'mesas';

    protected $fillable = [
        'usuario_id',
        'codigo_acceso',
        'capacidad',
        'estado',
        'grupo_codigo',
        'ocupada_desde',
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
     * El primer pedido no finalizado ocupa la mesa.
     *
     * `ocupada_desde` es el corte de la cuenta de la visita: se pone en
     * `now()` SOLO al pasar de libre → ocupada (si ya estaba ocupada se
     * conserva, así el corte sigue cubriendo la visita completa).
     */
    public function ocupar(): void
    {
        $this->update([
            'estado' => 'ocupada',
            'ocupada_desde' => $this->estado === 'ocupada' ? $this->ocupada_desde : now(),
        ]);
    }

    /**
     * Destruir la mesa (borrado lógico): es la baja definitiva del
     * servicio de la visita, llamada al cerrar/cancelar el último
     * pedido activo o por DELETE /mesas/{id}.
     *
     * Con `codigo_acceso` borrado de los resultados, el middleware del
     * cliente deja de encontrarla: los comensales quedan afuera solos.
     * `ocupada_desde` y los pedidos quedan para consultar la cuenta de
     * la visita terminada (cuenta/resumen leen con trashed).
     */
    public function destruir(): void
    {
        $this->delete();
    }
}
