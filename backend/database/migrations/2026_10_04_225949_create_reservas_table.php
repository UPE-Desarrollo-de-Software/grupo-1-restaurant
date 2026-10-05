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
        Schema::create('reservas', function (Blueprint $table) {
            $table->id();

            $table->foreignId('mesa_id')
                    ->constrained('mesas')
                    ->cascadeOnDelete();

            $table->foreignId('usuario_id')
                    ->nullable()
                    ->constrained('usuarios')
                    ->nullOnDelete();

            $table->foreignId('sesion_id')
                    ->nullable()
                    ->constrained('sesiones')
                    ->nullOnDelete();

            $table->string('nombre_cliente');
            $table->string('telefono_cliente');
            $table->date('fecha');
            $table->time('hora');
            $table->unsignedInteger('cant_personas');
            $table->enum('estado', ['pendiente', 'confirmada', 'cancelada', 'finalizada'])->default('pendiente');

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('reservas');
    }
};
