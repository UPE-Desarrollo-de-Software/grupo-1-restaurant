<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * CLIENTES — ENTIDAD CONGELADA (fuera del DER v2.1: "dividir la
     * cuenta" y los clientes recurrentes quedaron fuera del MVP).
     * Se conserva la tabla por si la funcionalidad vuelve; no tiene
     * rutas ni middleware activos. Ver documentacion/DER-v2.1-backend.md.
     */
    public function up(): void
    {
        Schema::create('clientes', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('sesionID');
            $table->string('nombre')->nullable();
            $table->timestamps();

            // Relacion con Sesion
            $table->foreign('sesionID')
                ->references('id')
                ->on('sesiones')
                ->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('clientes');
    }
};
