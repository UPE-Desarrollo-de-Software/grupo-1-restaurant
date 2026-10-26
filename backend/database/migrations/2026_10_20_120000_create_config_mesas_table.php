<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * CONFIG_MESA (DER del grupo): configuración de las piezas de mesa
     * del salón. Cada fila dice "hay `cantidad` mesas de `capacidad`
     * cubiertos".
     *
     * Reemplaza a la tabla PARAMETRO (borrada en la migración
     * siguiente): el AFORO del lugar pasa a ser
     * Σ(capacidad × cantidad) y el tope de mesas Σ cantidad
     * (ConfigMesaRepository). Flotante: sin FK a MESA.
     */
    public function up(): void
    {
        Schema::create('config_mesas', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('cantidad');
            $table->unsignedInteger('capacidad');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('config_mesas');
    }
};
