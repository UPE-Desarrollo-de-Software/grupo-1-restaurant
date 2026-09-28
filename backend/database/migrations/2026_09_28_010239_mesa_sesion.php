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
        Schema::create('mesa_sesion', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('mesaID');
            $table->unsignedBigInteger('sesionID');
            $table->timestamps();

            // Relaciones
            $table->foreign('mesaID')
                ->references('id')
                ->on('mesas')
                ->onDelete('cascade');

            $table->foreign('sesionID')
                ->references('id')
                ->on('sesiones')
                ->onDelete('cascade');

            // Índices
            $table->index('mesaID');
            $table->index('sesionID');

            // Evitar duplicados
            $table->unique(['mesaID', 'sesionID']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('mesa_sesion');
    }
};
