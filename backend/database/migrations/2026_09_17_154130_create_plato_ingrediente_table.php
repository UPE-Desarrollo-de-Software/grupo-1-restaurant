<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * PLATO_INGREDIENTE (DER v2.1) — antes `producto_ingrediente`.
     *
     * Relación N:N plato ↔ ingrediente con los dos flags que pide el DER:
     *  - `opcional`:     el cliente puede modificarlo (excluir o agregar).
     *  - `por_defecto`:  viene incluido en el plato (solo esos se pueden
     *                    excluir; los que no vienen por defecto se pueden
     *                    agregar).
     */
    public function up(): void
    {
        Schema::create('plato_ingrediente', function (Blueprint $table) {
            $table->id();

            $table->foreignId('plato_id')
                ->constrained('platos')
                ->cascadeOnDelete();

            $table->foreignId('ingrediente_id')
                ->constrained('ingredientes')
                ->cascadeOnDelete();

            $table->boolean('opcional')->default(true);
            $table->boolean('por_defecto')->default(true);

            $table->unique(['plato_id', 'ingrediente_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('plato_ingrediente');
    }
};
