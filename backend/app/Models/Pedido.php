<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * PEDIDO (DER v2.2: relación unitaria PEDIDO→PEDIDO).
 *
 * Cuelga de MESA (MESA "genera" PEDIDO); el mozo responsable se deriva
 * por PEDIDO → MESA → USUARIO. La mesa admite VARIOS pedidos activos
 * en paralelo: cada comensal que entra con el código tiene el suyo.
 *
 * `pedido_padre_id`: si un comensal que ya pidió vuelve a pedir, el
 * pedido nuevo apunta con esta FK a SU primer pedido (la raíz del
 * árbol, profundidad ≤ 2). El front guarda en el dispositivo cuál es
 * su pedido raíz: eso reemplaza a la entidad CLIENTE (eliminada del
 * DER, rebote 2).
 *
 * Flujo de envío en dos pasos (auto-pedido):
 *   en_curso → confirmado → enviado
 * `confirmado` (el estado) = el mozo validó que todas las líneas del
 * pedido tienen detalle_pedidos.confirmado = true (o forzó).
 *
 * Estados finales (cerrado/cancelado): destruyen la mesa cuando no
 * quedan pedidos activos en ella.
 */
class Pedido extends Model
{
    protected $fillable = [
        'mesa_id',
        'pedido_padre_id',
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
     * Pedido raíz del comensal (null si este es una raíz).
     */
    public function pedidoPadre(): BelongsTo
    {
        return $this->belongsTo(Pedido::class, 'pedido_padre_id');
    }

    /**
     * Pedidos hijos: las repeticiones del mismo comensal (cada uno
     * apunta a la raíz, no en cadena).
     */
    public function hijos(): HasMany
    {
        return $this->hasMany(Pedido::class, 'pedido_padre_id');
    }

    /**
     * ¿Es una raíz? (necesario para validar que un pedido_padre_id
     * recibido apunte a una raíz y no a otro hijo).
     */
    public function esRaiz(): bool
    {
        return $this->pedido_padre_id === null;
    }

    /**
     * Estados finales: destruyen la mesa cuando es el último activo y
     * no admiten cambios.
     */
    public function estaFinalizado(): bool
    {
        return in_array($this->estado, ['cerrado', 'cancelado'], true);
    }
}
