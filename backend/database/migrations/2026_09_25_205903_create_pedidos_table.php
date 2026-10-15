<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * PEDIDO (DER v2.2: relación unitaria PEDIDO→PEDIDO).
     *
     * Cambios del rebote 2 (oct-2026):
     *  - **`pedido_padre_id`**: auto-FK opcional. Cada comensal tiene
     *    SU pedido (un pedido por comensal); si vuelve a pedir, el
     *    pedido nuevo apunta con `pedido_padre_id` al PRIMERO que hizo
     *    esa persona (profundidad 2: los hijos siempre apuntan a la
     *    raíz). La identidad vive en el dispositivo del cliente (front
     *    guarda su pedido raíz), por eso la BD no necesita CLIENTE.
     *  - **Se eliminó la regla "1 pedido no-finalizado por mesa"**: con
     *    varios comensales auto-pidiendo, la mesa admite varios pedidos
     *    activos en paralelo (cada uno con su gate de confirmación).
     *
     * Sin cambios:
     *  - `mesa_id`: FK cascade; el mozo responsable se deriva por
     *    PEDIDO → MESA → USUARIO.
     *  - `estado`: valores exactos del cuadro de notas del DER.
     *    `cerrado` y `cancelado` son estados finales; al finalizar el
     *    último pedido activo la mesa se destruye (borrado lógico).
     *  - Flujo de envío en dos pasos:
     *      en_curso → confirmado → enviado
     *    (POST /pedidos/{id}/confirmar valida el gate sobre
     *    `detalle_pedidos.confirmado`; POST .../enviar exige confirmado).
     */
    public function up(): void
    {
        Schema::create('pedidos', function (Blueprint $table) {
            $table->id();

            $table->foreignId('mesa_id')
                ->constrained('mesas')
                ->cascadeOnDelete();

            // Relación unitaria PEDIDO→PEDIDO (DER v2.2): el pedido
            // hijo que arma un comensal que ya pidió apunta a SU
            // primer pedido (raíz). nullOnDelete: si la raíz se fuera,
            // los hijos quedan huérfanos pero no se borran.
            $table->foreignId('pedido_padre_id')
                ->nullable()
                ->constrained('pedidos')
                ->nullOnDelete();

            $table->enum('estado', [
                'en_curso',
                'confirmado',
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
