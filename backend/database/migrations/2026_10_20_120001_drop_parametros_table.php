<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * BORRADO de PARAMETRO: el DER del grupo la reemplaza por
     * CONFIG_MESA (la configuración deja de ser clave/valor genérica y
     * pasa a ser la composición de piezas del salón). El único dato
     * que guardaba (`capacidad_total`) vive hoy en
     * Σ(config_mesas.capacidad × config_mesas.cantidad).
     */
    public function up(): void
    {
        Schema::dropIfExists('parametros');
    }

    /**
     * Reverse the migrations (recrea la tabla clave/valor vacía).
     */
    public function down(): void
    {
        Schema::create('parametros', function (Blueprint $table) {
            $table->string('clave')->primary();
            $table->string('valor');
            $table->timestamps();
        });
    }
};
