<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * SESIONES — ENTIDAD CONGELADA (fuera del DER v2.1).
     *
     * El DER v2.1 eliminó SESION / MESA_SESION / CLIENTES. Estas tablas
     * se conservan tal cual por decisión del equipo (la funcionalidad
     * podría volver en otra entidad), pero están desconectadas del flujo
     * activo: no hay rutas, ni middleware, ni uso en PedidoService.
     * Ver documentacion/DER-v2.1-backend.md.
     */
    public function up(): void
    {
        Schema::create('sesiones', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('mozoID');
            $table->string('codigoGrupal', 4)->unique();
            $table->dateTime('inicio');
            $table->dateTime('fin')->nullable();
            $table->enum('estado', ['activa', 'cerrada', 'expirada'])->default('activa');
            $table->timestamps();

            // Relación con Usuario (Mozo)
            $table->foreign('mozoID')
                ->references('id')
                ->on('usuarios')
                ->onDelete('cascade');

            // Índices para búsquedas rápidas
            $table->index('codigoGrupal');
            $table->index('estado');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sesiones');
    }
};
