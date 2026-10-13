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
        Schema::create('detalle_pedidos', function (Blueprint $table) {
            $table->id();

            $table->foreignId('pedido_id')
                ->constrained('pedidos')
                ->cascadeOnDelete();

            $table->foreignId('producto_id')
                ->constrained('productos');

            $table->integer('cantidad');
            $table->decimal('precio_lista', 10, 2); // precio base sin promocion agregada
            $table->decimal('precio_final', 10, 2); // precio final con promocion agregada (suerte de subtotal)

            $table->foreignId('promocion_id') // nueva relacion con promocion, puede ser nula si no se aplica ninguna promocion
                ->nullable()
                ->nullOnDelete()
                ->constrained('promociones');



            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('detalle_pedidos');
    }
};
