<?php

namespace Database\Seeders;

use App\Models\Ingrediente;
use Illuminate\Database\Seeder;

class IngredienteSeeder extends Seeder
{
    /**
     * Crea los ingredientes base (no opcionales, sin costo) y los extras
     * opcionales (con precioAdicional). Idempotente por nombre.
     */
    public function run(): void
    {
        $base = [
            'Masa de pizza',
            'Salsa de tomate',
            'Muzzarella',
            'Provolone',
            'Orégano',
            'Albahaca',
            'Pan de hamburguesa',
            'Medallón de carne',
            'Carne picada',
            'Milanesa de ternera',
            'Jamón cocido',
            'Lechuga',
            'Tomate',
            'Cebolla',
            'Huevo',
            'Papas fritas',
            'Dulce de leche',
            'Crema',
            'Helado de crema',
        ];

        $extras = [
            'Panceta' => 900,
            'Queso cheddar' => 600,
            'Huevo frito' => 700,
            'Aceitunas' => 400,
            'Morrón asado' => 500,
        ];

        foreach ($base as $nombre) {
            Ingrediente::updateOrCreate(
                ['nombre' => $nombre],
                ['opcional' => false, 'precioAdicional' => 0]
            );
        }

        foreach ($extras as $nombre => $precio) {
            Ingrediente::updateOrCreate(
                ['nombre' => $nombre],
                ['opcional' => true, 'precioAdicional' => $precio]
            );
        }
    }
}
