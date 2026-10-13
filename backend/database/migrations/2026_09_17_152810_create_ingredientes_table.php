<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * INGREDIENTE (DER v2.1): insumo de catálogo.
     *
     * Se eliminó la columna `opcional`: en el DER ese flag vive en la
     * relación PLATO_INGREDIENTE (por plato), no en el ingrediente en
     * sí. Acá queda solo el recargo de catálogo `precioAdicional`
     * (camelCase: es el nombre exacto del DER y una convención
     * verificada del repo, no normalizar a snake_case).
     */
    public function up(): void
    {
        Schema::create('ingredientes', function (Blueprint $table) {
            $table->id();
            $table->string('nombre');
            $table->decimal('precioAdicional', 10, 2);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ingredientes');
    }
};
