<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * DETALLE_PEDIDO (DER v2.1): una línea del pedido.
     *
     * Cambios vs la versión vieja:
     *  - `producto_id` → `plato_id` (rename de la entidad PRODUCTO a PLATO).
     *  - `precio_final` → `subtotal` (nombre exacto del DER dibujado;
     *    es el total de la línea ya con descuento y agregados).
     *  - Se quitó el comentario que decía "suerte de subtotal": ahora el
     *    nombre es el del DER.
     *
     * Fórmula (documentada en DER-v2.1-backend.md):
     *   subtotal = cantidad × (precio_lista + Σ precio_adicional de
     *              agregados) − descuento
     * Hoy `descuento` es 0 porque la integración del motor de
     * promociones en los pedidos está pendiente (PLAN-promociones.md);
     * `promocion_id` ya existe para congelar la promo aplicada.
     */
    public function up(): void
    {
        Schema::create('detalle_pedidos', function (Blueprint $table) {
            $table->id();

            $table->foreignId('pedido_id')
                ->constrained('pedidos')
                ->cascadeOnDelete();

            $table->foreignId('plato_id')
                ->constrained('platos');

            // Promo aplicada a la línea (histórico inmutable, nullable):
            // la oferta vigente en la carta vive en platos.promocion_id.
            $table->foreignId('promocion_id')
                ->nullable()
                ->nullOnDelete()
                ->constrained('promociones');

            $table->integer('cantidad');
            $table->decimal('precio_lista', 10, 2); // precio unitario de catálogo
            $table->decimal('subtotal', 10, 2);      // total de la línea

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('detalle_pedidos');
    }
};
