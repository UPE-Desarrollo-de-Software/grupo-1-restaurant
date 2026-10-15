<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * MESA (DER v2.2: entidad dinámica, sin código visible ni QR).
     *
     * Renombrada desde 2026_09_28_010047 para correr antes que
     * `pedidos` y `reservas`, que tienen FK hacia mesas.
     *
     * Cambios del rebote 2 (oct-2026):
     *  - SE ELIMINARON `codigo_mesa` y `qr`: la mesa ya no se precrea
     *    con identidad propia; la crea el mozo (o la reserva) AL MOMENTO
     *    y el único código que tiene es `codigo_acceso`.
     *  - `codigo_acceso` ahora es NOT NULL y UNIQUE: nace con la mesa
     *    (6 dígitos generado por MesaService::crearMesa) y no cambia
     *    durante su vida; se invalida solo cuando la mesa se destruye.
     *  - `softDeletes()` (borrado lógico): "se crea y se destruye"
     *    (respuesta del usuario al profes). El borrado es lógico para no
     *    arrastrar con cascade los pedidos históricos (ventas) que
     *    apuntan a la mesa. Para el resto de la app la fila no existe
     *    (listados, middleware por código, aforo).
     *
     * Resto sin cambios:
     *  - `usuario_id`: mozo responsable (DER: USUARIO "atiende" MESA).
     *  - `estado`: libre | ocupada | reservada (valores del DER).
     *  - `ocupada_desde`: corte de la cuenta de la visita (se pone al
     *    pasar a ocupada con el primer pedido).
     *  - `grupo_codigo`: agrupación de lectura (no es FK).
     *  - `capacidad`: asientos de ESTA mesa; la sumatoria de las mesas
     *    vivas contra `PARAMETRO.capacidad_total` (aforo del lugar).
     */
    public function up(): void
    {
        Schema::create('mesas', function (Blueprint $table) {
            $table->id();

            $table->foreignId('usuario_id')
                ->nullable()
                ->constrained('usuarios')
                ->nullOnDelete();

            $table->string('codigo_acceso')->unique();
            $table->integer('capacidad');
            $table->enum('estado', ['libre', 'ocupada', 'reservada'])->default('libre');
            $table->unsignedBigInteger('grupo_codigo')->nullable()->index();
            $table->dateTime('ocupada_desde')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mesas');
    }
};
