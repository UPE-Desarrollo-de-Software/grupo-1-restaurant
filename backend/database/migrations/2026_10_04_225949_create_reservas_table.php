<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * RESERVA (DER v3.0).
     *
     * Cambios vs la versión vieja:
     *  - se quitó `sesion_id` (la entidad SESION fue eliminada del DER).
     *  - se quitó `usuario_id`: el DER v3.0 no dibuja relación
     *    USUARIO–RESERVA. Quien crea la reserva no se persiste.
     *  - se quitó `nombre_solicitante`: el DER v3.0 solo tiene
     *    `contacto_solicitante`.
     *  - `cant_personas` → `cantPersonas`: nombre exacto del DER v3.0
     *    (camelCase, convención del proyecto).
     *  - `estado`: valores del cuadro de notas del DER
     *    (pendiente | cancelada | finalizada | no_asistio).
     *
     * `mesa_id` nace NOT NULL acá y se vuelve NULLABLE en la migración
     * posterior (2026_10_22_...): la reserva ya no apunta a una mesa,
     * reserva CAPACIDADES del inventario (`reserva_inventario`).
     */
    public function up(): void
    {
        Schema::create('reservas', function (Blueprint $table) {
            $table->id();

            $table->foreignId('mesa_id')
                ->constrained('mesas')
                ->cascadeOnDelete();

            $table->string('contacto_solicitante');
            $table->date('fecha');
            $table->time('hora');
            $table->unsignedInteger('cantPersonas');
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
