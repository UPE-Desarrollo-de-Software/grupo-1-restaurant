<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * PRE-ORDEN: 1 fila por línea de carrito de la reserva (entidad
     * nueva fuera del DER v3.0, igual que reserva_inventario).
     * `pedido_id` NULL = pendiente de convertir; se estampa al
     * convertir (evita la doble conversión). No lleva precios: se
     * calculan al convertir con el motor actual (agregarLinea).
     */
    public function up(): void
    {
        Schema::create('detalle_preorden', function (Blueprint $table) {
            $table->id();
            $table->foreignId('reserva_id')->constrained('reservas')->cascadeOnDelete();
            $table->foreignId('plato_id')->constrained('platos');
            $table->unsignedInteger('cantidad');
            $table->foreignId('pedido_id')->nullable()->constrained('pedidos')->nullOnDelete();
            $table->timestamps();

            // 1 fila por plato por reserva: el guardado hace merge por
            // plato_id (cantidades se reemplazan, no se acumulan).
            $table->unique(['reserva_id', 'plato_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::drop('detalle_preorden');
    }
};
