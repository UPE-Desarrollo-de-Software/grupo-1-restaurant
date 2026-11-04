<?php

namespace Database\Seeders;

use App\Models\Ingrediente;
use Illuminate\Database\Seeder;

/**
 * Ingredientes del catálogo (DER v2.1).
 *
 * Ya no tienen el flag `opcional`: eso vive en `plato_ingrediente`
 * (por plato). Acá solo queda `precioAdicional` (recargo de catálogo).
 *
 * Los de `$base` son ingredientes "de receta": en cada plato se
 * asignan como default (obligatorio u opcional según el plato) o como
 * agregable sin recargo. Los de `$extras` son agregables con recargo
 * (también pueden ser default en otro plato: los flags son por plato).
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
            // Bebidas: cada una es el ingrediente default de su plato.
            'Agua mineral',
            'Gaseosa',
            'Cerveza artesanal',
            'Vino tinto',
        ];

        // Extras: solo se AGREGAN a un plato y tienen recargo.
        $extras = [
            'Panceta' => 900,
            'Queso cheddar' => 600,
            'Huevo frito' => 700,
            'Aceitunas' => 400,
            'Morrón asado' => 500,
            'Carne extra' => 1800,
            'Salchicha' => 900,
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
