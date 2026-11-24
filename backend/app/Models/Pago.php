<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * PAGO (DER v3.2: integración de Mercado Pago — Checkout Pro).
 *
 * Cada fila es un intento de pago de la visita: `tipo` 'total'
 * (cobra el saldo de la mesa) o 'mi_parte' (cobra el subtotal de la
 * raíz del comensal, con `pedido_id` cargado). El monto lo calcula
 * SIEMPRE el backend al crear la preferencia.
 *
 * El webhook de MP es la fuente de verdad: `estado` pasa a
 * 'aprobado'/'rechazado' al recibir la notificación firmada, y
 * `mp_payment_id` (UNIQUE) garantiza la idempotencia. 'en_proceso'
 * = MP tiene un pago sin resolver (fondos retenidos): no cuenta en
 * el saldo y bloquea un nuevo intento (red de seguridad contra el
 * doble cobro).
 *
 * `medio_pago` registra cómo se cobró: 'efectivo' (lo registra el
 * mozo al cerrar la visita) o 'mercado_pago' (Checkout Pro).
 */
class Pago extends Model
{
    public const ESTADO_PENDIENTE = 'pendiente';

    public const ESTADO_EN_PROCESO = 'en_proceso';

    public const ESTADO_APROBADO = 'aprobado';

    public const ESTADO_RECHAZADO = 'rechazado';

    public const ESTADO_CANCELADO = 'cancelado';

    public const TIPO_TOTAL = 'total';

    public const TIPO_MI_PARTE = 'mi_parte';

    public const MEDIO_EFECTIVO = 'efectivo';

    public const MEDIO_MERCADO_PAGO = 'mercado_pago';

    protected $fillable = [
        'mesa_id',
        'pedido_id',
        'tipo',
        'monto',
        'estado',
        'medio_pago',
        'mp_preference_id',
        'mp_payment_id',
        'mp_detalle',
        'fecha',
    ];

    protected function casts(): array
    {
        return [
            'monto' => 'float',
            'fecha' => 'datetime',
            'mp_detalle' => 'array',
        ];
    }

    public function mesa(): BelongsTo
    {
        return $this->belongsTo(Mesa::class);
    }

    /**
     * Raíz del comensal que pagó "mi parte" (null en pagos 'total').
     */
    public function pedido(): BelongsTo
    {
        return $this->belongsTo(Pedido::class);
    }
}
