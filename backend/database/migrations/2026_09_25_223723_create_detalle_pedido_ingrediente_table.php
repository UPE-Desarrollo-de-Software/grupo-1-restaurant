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
        Schema::create('detalle_pedido_ingrediente', function (Blueprint $table) {
            $table->id();

            $table->foreignId('detalle_pedido_id')
                    ->constrained('detalle_pedidos')
                    ->cascadeOnDelete();

            $table->foreignId('ingrediente_id')
                    ->constrained('ingredientes');

            $table->decimal('precio_adicional', 10, 2);

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('detalle_pedido_ingrediente');
    }
};
