<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * DETALLE_PEDIDO (DER v2.2): una línea del pedido.
     *
     * Cambios del rebote 2 (oct-2026):
     *  - **`confirmado`**: la confirmación por línea se mudó de la tabla
     *    (ya inexistente) `cliente_detalle_pedido` a la propia línea.
     *    Líneas que arma el cliente nacen en `false`; las del mozo en
     *    `true` (pasan el gate de envío sin trámite). El gate de
     *    confirmarResumen cuenta `confirmado = false` acá.
     *  - **Se eliminó el pivot `cliente_detalle_pedido`**: la entidad
     *    CLIENTE salió del DER; la atribución por comensal la resuelve
     *    PEDIDO→PEDIDO (cada quien su pedido).
     *
     * Sin cambios:
     *  - `producto_id` → `plato_id` (rename PRODUCTO a PLATO).
     *  - Fórmula documentada en DER-v2.1-backend.md:
     *      subtotal = cantidad × (precio_lista + Σ precio_adicional de
     *                 agregados) − descuento
     *    `descuento` hoy es 0 (motor de promociones pendiente,
     *    PLAN-promociones.md); `promocion_id` congela la promo aplicada.
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

            // Gate de envío por línea (antes en el pivot cliente_...):
            // cliente → false, mozo → true.
            $table->boolean('confirmado')->default(false);

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
