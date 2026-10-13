<?php

namespace Database\Seeders;

use App\Models\Ingrediente;
use Illuminate\Database\Seeder;

/**
 * Ingredientes del catálogo (DER v2.1).
 *
 * Ya no tienen el flag `opcional`: eso vive en `plato_ingrediente`
 * (por plato). Acá solo queda `precioAdicional` (recargo de catálogo).
 * Idempotente por nombre.
 */
class IngredienteSeeder extends Seeder
{
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

        // Extras: solo se AGREGAN a un plato y tienen recargo.
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
                ['precioAdicional' => 0]
            );
        }

        foreach ($extras as $nombre => $precio) {
            Ingrediente::updateOrCreate(
                ['nombre' => $nombre],
                ['precioAdicional' => $precio]
            );
        }
    }
}
