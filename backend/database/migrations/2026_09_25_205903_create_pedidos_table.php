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
        Schema::create('pedidos', function (Blueprint $table) {
            $table->id();

            $table->foreignId('sesion_id')
                    ->references('id')
                    ->on('sesiones')
                    ->cascadeOnDelete();

            $table->enum('estado', [
                'en_seleccion',
                'recibido',
                'en_preparacion',
                'listo',
                'entregado'
            ])->default('en_seleccion');//acordarse de migrar

            $table->decimal('total', 10, 2)->default(0);

            $table->dateTime('fecha')->useCurrent();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pedidos');
    }
};
