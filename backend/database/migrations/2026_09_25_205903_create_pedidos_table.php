<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * PEDIDO (DER v2.1).
     *
     * Cambios vs la versión vieja (modelo "con SESION", ya eliminado):
     *  - `sesion_id` y `cliente_id` se eliminaron: el pedido ahora
     *    cuelga directo de la mesa (DER: MESA "genera" PEDIDO).
     *  - `mesa_id`: FK nueva. El mozo responsable NO se guarda acá, se
     *    deriva por PEDIDO → MESA → USUARIO (decisión del DER).
     *  - `estado`: valores exactos del cuadro de notas del DER.
     *    `cerrado` y `cancelado` son estados finales y liberan la mesa.
     *
     * Regla de negocio (cuadro de notas): a lo sumo 1 pedido
     * no-finalizado por mesa — la valida PedidoService al crear.
     */
    public function up(): void
    {
        Schema::create('pedidos', function (Blueprint $table) {
            $table->id();

            $table->foreignId('mesa_id')
                ->constrained('mesas')
                ->cascadeOnDelete();

            $table->enum('estado', [
                'en_curso',
                'enviado',
                'en_preparacion',
                'entregado',
                'cerrado',
                'cancelado',
            ])->default('en_curso');

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
