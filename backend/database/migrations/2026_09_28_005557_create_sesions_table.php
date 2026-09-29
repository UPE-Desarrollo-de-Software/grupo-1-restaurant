<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
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
