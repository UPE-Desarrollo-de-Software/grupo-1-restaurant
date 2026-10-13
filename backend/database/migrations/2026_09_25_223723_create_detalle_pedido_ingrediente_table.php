<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * DETALLE_INGREDIENTE (DER v2.1) — en el código se mantiene el
     * nombre de tabla `detalle_pedido_ingrediente` (extensión
     * documentada: renombrarla no aporta y rompería datos existentes).
     *
     * Ingredientes que se pidió excluir o agregar en una línea.
     *
     * Cambios vs la versión vieja:
     *  - `tipo`: enum('excluido', 'agregado') — antes solo se podían
     *    registrar agregados, el modelo no podía representar exclusiones.
     *  - `precio_adicional` pasó a nullable: solo lleva recargo cuando
     *    `tipo = 'agregado'` (excluir no modifica el precio, decisión
     *    del DER). El importe guardado es el cobrado en esa línea, que
     *    puede diferir del precio de catálogo de INGREDIENTE.
     */
    public function up(): void
    {
        Schema::create('detalle_pedido_ingrediente', function (Blueprint $table) {
            $table->id();

            $table->foreignId('detalle_pedido_id')
                ->constrained('detalle_pedidos')
                ->cascadeOnDelete();

            $table->foreignId('ingrediente_id')
                ->constrained('ingredientes');

            $table->enum('tipo', ['excluido', 'agregado'])->default('agregado');
            $table->decimal('precio_adicional', 10, 2)->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('detalle_pedido_ingrediente');
    }
};
