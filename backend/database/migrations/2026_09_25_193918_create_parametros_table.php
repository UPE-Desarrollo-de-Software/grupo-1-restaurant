<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * PARAMETRO (DER v2.2): configuración del restaurante en clave/valor.
     *
     * Nació por el rebote de los profes: "hay una capacidad del lugar y
     * usarla como límite". Guarda `capacidad_total` = aforo máximo del
     * salón (la sumatoria de las mesas vivas no puede superarlo al
     * crear una mesa nueva: ver MesaService::crearMesa).
     *
     * El nombre del archivo quedó como create_clientes... no: fue
     * reescrito y renombrado a create_parametros (migrate:fresh en
     * todos los entornos; la tabla `clientes` ya no existe — el DER
     * eliminó la entidad CLIENTE).
     */
    public function up(): void
    {
        Schema::create('parametros', function (Blueprint $table) {
            $table->string('clave')->primary();
            $table->string('valor');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('parametros');
    }
};
