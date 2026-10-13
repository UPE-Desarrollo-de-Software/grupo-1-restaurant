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
        Schema::create('promocion_categoria', function (Blueprint $table) {
            $table->id();
            $table->foreignId('promocion_id')
                ->constrained('promociones')
                ->cascadeOnDelete();

            $table->foreignId('categoria_id')
                ->constrained('categorias')
                ->cascadeOnDelete();

            $table->unique(['promocion_id', 'categoria_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('promocion_categoria');
    }
};
