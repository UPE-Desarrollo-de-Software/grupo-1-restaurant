<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * MESA (DER v2.1).
     *
     * Renombrada desde 2026_09_28_010047 para correr antes que
     * `pedidos` y `reservas`, que tienen FK hacia mesas.
     *
     * Cambios vs la versión vieja:
     *  - `usuario_id`: mozo responsable de la mesa (DER: relación
     *    USUARIO "atiende" MESA). nullable para no romper mesas
     *    existentes sin mozo asignado.
     *  - `codigo_mesa`: identificador visible de la mesa (estaba en el
     *    DER y no existía en el código; el viejo bug de SesionService
     *    que seleccionaba `mesas.numero_mesa` venía de acá).
     *  - `estado`: valor `disponible` pasó a `libre`, valores exactos
     *    del cuadro de notas del DER: libre | ocupada | reservada.
     *
     * Pendiente (documentado en documentacion/DER-v2.1-backend.md):
     * definir si `codigo_mesa` va con UNIQUE.
     */
    public function up(): void
    {
        Schema::create('mesas', function (Blueprint $table) {
            $table->id();

            $table->foreignId('usuario_id')
                ->nullable()
                ->constrained('usuarios')
                ->nullOnDelete();

            $table->integer('codigo_mesa');
            $table->integer('capacidad');
            $table->enum('estado', ['libre', 'ocupada', 'reservada'])->default('libre');
            $table->string('qr')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mesas');
    }
};
