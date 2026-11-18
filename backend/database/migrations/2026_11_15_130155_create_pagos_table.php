<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * PAGO (DER v3.2: entidad nueva para la integración de
     * Mercado Pago — Checkout Pro).
     *
     * Reglas:
     *  - `tipo`: 'total' cobra el saldo de la visita; 'mi_parte'
     *    cobra el subtotal de la raíz del comensal. El monto SIEMPRE
     *    lo calcula el backend (nunca viene del cliente).
     *  - `pedido_id` OPCIONAL (0..1 en DER): solo se llena cuando el
     *    pago es "mi parte" (apunta a la raíz del comensal); en
     *    'total' queda NULL.
     *  - `mp_payment_id` UNIQUE: idempotencia — el webhook puede
     *    reintentar y el pago aprobado se procesa una sola vez.
     *  - `estado`: pendiente (preferencia creada, MP sin pagar) →
     *    en_proceso (MP ya tiene un pago sin resolver: fondos
     *    retenidos) → aprobado | rechazado | cancelado. `en_proceso`
     *    NO cuenta en el saldo y bloquea un nuevo intento de pago.
     *  - `medio_pago`: cómo se cobró (efectivo en el local o Mercado
     *    Pago). Por defecto Mercado Pago (los pagos del comensal).
     */
    public function up(): void
    {
        Schema::create('pagos', function (Blueprint $table) {
            $table->id();

            $table->foreignId('mesa_id')
                ->constrained('mesas')
                ->cascadeOnDelete();

            // Opcional: solo en pagos 'mi_parte' (raíz del comensal).
            $table->foreignId('pedido_id')
                ->nullable()
                ->constrained('pedidos')
                ->nullOnDelete();

            $table->enum('tipo', ['total', 'mi_parte']);
            $table->decimal('monto', 10, 2);

            $table->enum('estado', [
                'pendiente',
                'en_proceso',
                'aprobado',
                'rechazado',
                'cancelado',
            ])->default('pendiente');

            // Cómo se cobró: efectivo (registrado por el mozo al
            // cerrar la visita) o Mercado Pago (Checkout Pro).
            $table->enum('medio_pago', ['efectivo', 'mercado_pago'])
                ->default('mercado_pago');

            $table->string('mp_preference_id')->nullable();
            $table->string('mp_payment_id')->nullable()->unique();

            $table->dateTime('fecha')->useCurrent();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pagos');
    }
};
