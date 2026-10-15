<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * PERMISO + ROL_PERMISO (DER v2.1): autorización basada en permisos.
     *
     * Son las dos únicas tablas nuevas que agregó la alineación con el
     * DER: los permisos de cada rol se guardan acá en vez de resolverlos
     * con strings literales ('Gerente', 'Mozo') en los middlewares.
     *
     * Corre después de `rol` (FK) y antes de los seeders que la usan
     * (PermisoSeeder / RolSeeder).
     */
    public function up(): void
    {
        Schema::create('permisos', function (Blueprint $table) {
            $table->id();
            $table->string('nombre')->unique(); // p.ej. gestionar_platos
            $table->string('modulo');           // p.ej. carta, usuarios, pedidos
            $table->timestamps();
        });

        Schema::create('rol_permiso', function (Blueprint $table) {
            $table->foreignId('rol_id')->constrained('rol')->cascadeOnDelete();
            $table->foreignId('permiso_id')->constrained('permisos')->cascadeOnDelete();

            $table->unique(['rol_id', 'permiso_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('rol_permiso');
        Schema::dropIfExists('permisos');
    }
};
