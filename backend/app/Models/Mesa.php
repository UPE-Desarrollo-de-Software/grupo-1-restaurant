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
 * `codigo_acceso`: ÚNICO código de la mesa, nace con ella (4 dígitos,
 *   lo genera el mozo o el sistema al crearla) y no
 *   cambia nunca: es la credencial del cliente (Authorization:
 *   Bearer {codigo_acceso}) hasta que la mesa se destruye.
 * `grupo_codigo`: agrupación de lectura para varias mesas (no es FK).
 * `estado`: libre | ocupada.
 * `deleted_at`: borrado LÓGICO = "destrucción" de la mesa (decisión
 *   del rebote 2 con los profes): los pedidos históricos conservan su
 *   FK cascade hacia acá (las ventas no se borran) y para la app la
 *   mesa deja de existir (listados, aforo y validación por código la
 *   ignoran).
 *
 * Ciclo de vida: la crea el mozo (POST /mesas), el primer pedido la
 * pone 'ocupada' y se destruye (borrado lógico) al cerrar la visita
 * (POST /mesas/{mesa}/cerrar: el cliente pagó) o con DELETE
 * (baja administrativa del gerente). Una fila = una visita: el corte
 * de la cuenta es `created_at` de la fila.
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

    /**
     * El primer pedido no finalizado ocupa la mesa (o el mozo a mano).
     */
    public function ocupar(): void
    {
        $this->update([
            'estado' => 'ocupada',
        ]);
    }

    /**
     * Destruir la mesa (borrado lógico): es la baja definitiva del
     * servicio de la visita, llamada al cerrar/cancelar la visita
     * (`POST /mesas/{mesa}/cerrar`) o por DELETE /mesas/{id}.
     *
     * Con `codigo_acceso` borrado de los resultados, el middleware del
     * cliente deja de encontrarla: los comensales quedan afuera solos.
     * `created_at` y los pedidos quedan para consultar la cuenta de
     * la visita terminada (cuenta/resumen leen con trashed).
     */
    public function destruir(): void
    {
        $this->delete();
    }
}
