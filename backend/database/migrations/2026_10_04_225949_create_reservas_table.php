<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * RESERVA (DER v2.1).
     *
     * Cambios vs la versión vieja:
     *  - se quitó `sesion_id` (la entidad SESION fue eliminada del DER).
     *  - `nombre_cliente` → `nombre_solicitante` y `telefono_cliente` →
     *    `contacto_solicitante`: nombres exactos del DER dibujado.
     *  - `estado`: valores del cuadro de notas del DER
     *    (pendiente | cancelada | finalizada | no_asistio). Se quitó
     *    `confirmada`, que no estaba en el diagrama.
     *  - se conserva `usuario_id` (mozo que toma la reserva): figura en
     *    el DER dibujado aunque sin línea de relación dibujada.
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

            $table->string('nombre_solicitante');
            $table->string('contacto_solicitante');
            $table->date('fecha');
            $table->time('hora');
            $table->unsignedInteger('cant_personas');
            $table->enum('estado', ['pendiente', 'cancelada', 'finalizada', 'no_asistio'])
                ->default('pendiente');

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
