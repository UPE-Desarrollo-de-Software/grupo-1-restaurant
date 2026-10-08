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
        Schema::create('promociones', function (Blueprint $table) {
            $table->id();
            $table->string('nombre');
            $table->enum('tipo', ['porcentaje', 'monto_fijo', 'precio_fijo', '2x1']);
            // monto_fijo: la cantidad que se resta
            // precio_fijo: el precio final del producto(Validar que sea menor al precio original)
            $table->decimal('valor', 8, 2)->nullable(); //en caso de ser 2x1 seria nulo
            $table->enum('ambito', ['producto', 'categoria', 'pedido']); // considerar ingredientes como otro ambito posible
            $table->datetime('fecha_inicio')->nullable();
            $table->datetime('fecha_fin')->nullable();
            $table->json("condiciones")->nullable(); //condiciones de la promocion, por ejemplo: "aplica solo para productos de categoria X"
            $table->boolean('activo')->default(true);

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('promociones');
    }
};
