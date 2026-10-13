<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * PLATO (DER v2.1) — antes llamada entidad PRODUCTO, ahora el código
     * también usa el nombre PLATO (tabla `platos`, modelo `Plato`).
     *
     * Renombrada desde `create_productos_table` para reflejar el DER.
     */
    public function up(): void
    {
        Schema::create('platos', function (Blueprint $table) {
            $table->id();

            $table->foreignId('categoria_id')->constrained('categorias');

            // FK opcional (DER: línea discontinua "aplica_a"): oferta
            // vigente en la carta. nullOnDelete porque si se borra la
            // promo el plato sigue existiendo, solo pierde la oferta.
            $table->foreignId('promocion_id')
                ->nullable()
                ->constrained('promociones')
                ->nullOnDelete();

            $table->string('nombre');
            $table->text('descripcion')->nullable();
            $table->decimal('precio', 10, 2);
            $table->string('imagen')->nullable();
            $table->boolean('disponible')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('platos');
    }
};
