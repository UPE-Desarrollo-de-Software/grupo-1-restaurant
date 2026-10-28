<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Suma el estado `listo` al ENUM de pedidos.estado (tramo de cocina:
 * enviado → en_preparacion → listo → entregado → cerrado).
 *
 * En SQLite (tests) la tabla nace de create_pedidos ya actualizada;
 * esta migración es la que actualiza a las bases ya migradas
 * (MySQL de desarrollo).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pedidos', function (Blueprint $table) {
            $table->enum('estado', [
                'en_curso',
                'confirmado',
                'enviado',
                'en_preparacion',
                'listo',
                'entregado',
                'cerrado',
                'cancelado',
            ])->default('en_curso')->change();
        });
    }

    public function down(): void
    {
        // No se revierte: las filas en 'listo' no volverían a caber
        // en el ENUM viejo.
    }
};
