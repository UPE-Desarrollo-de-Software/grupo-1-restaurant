<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * RESERVA sin MESA propia: `mesa_id` pasa a nullable.
     *
     * La reserva ya no se ata a una mesa física: es un HOLD sobre el
     * inventario del salón (`CONFIG_MESA` − reservas pendientes del
     * horario) que se materializa en `reserva_inventario` (capacidades
     * asignadas). La columna queda por compatibilidad (FK/histórico)
     * pero el alta ya no la llena.
     *
     * Se hace en migración aparte (Schema::table + change) para no
     * reescribir la migración original ya registrada en las BDs.
     */
    public function up(): void
    {
        Schema::table('reservas', function (Blueprint $table) {
            $table->foreignId('mesa_id')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('reservas', function (Blueprint $table) {
            $table->foreignId('mesa_id')->nullable(false)->change();
        });
    }
};
