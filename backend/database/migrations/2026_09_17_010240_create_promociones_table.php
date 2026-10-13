<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * PROMOCION (DER v2.1): oferta de catálogo.
     *
     * El alcance de la promo ya NO se guarda en la tabla (se eliminaron
     * `ambito` y `condiciones` para ser fiel al DER): la relación
     * catálogo vive en `platos.promocion_id` (1 promo : 0..N platos,
     * 1 plato : 0..1 promo) y el registro histórico en
     * `detalle_pedidos.promocion_id`.
     *
     * Nota de orden: esta migración se renombró a 2026_09_17_010240 para
     * correr antes que `platos`, que tiene la FK hacia promociones.
     */
    public function up(): void
    {
        Schema::create('promociones', function (Blueprint $table) {
            $table->id();
            $table->string('nombre');

            // DER: enum tipo = porcentaje | monto_fijo | precio_fijo | 2x1
            $table->enum('tipo', ['porcentaje', 'monto_fijo', 'precio_fijo', '2x1']);

            // porcentaje: % a descontar; monto_fijo: resta fija;
            // precio_fijo: precio final unitario; 2x1: queda en null.
            $table->decimal('valor', 8, 2)->nullable();

            // Ventana de vigencia: solo gobierna la oferta en la carta.
            // El descuento cobrado queda congelado en detalle_pedidos.
            $table->datetime('fecha_inicio')->nullable();
            $table->datetime('fecha_fin')->nullable();

            $table->boolean('activo')->default(true);

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('promociones');
    }
};
