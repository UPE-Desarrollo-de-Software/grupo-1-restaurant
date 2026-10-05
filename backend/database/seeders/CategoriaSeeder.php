<?php

namespace Database\Seeders;

use App\Models\Categoria;
use Illuminate\Database\Seeder;

class CategoriaSeeder extends Seeder
{
    /**
     * Crea las categorías del menú (idempotente: se puede correr varias veces).
     */
    public function run(): void
    {
        $categorias = [
            ['nombre' => 'Entradas', 'descripcion' => 'Para compartir antes del plato principal'],
            ['nombre' => 'Platos principales', 'descripcion' => 'Minutas y platos del día'],
            ['nombre' => 'Pizzas', 'descripcion' => 'Pizzas a la piedra'],
            ['nombre' => 'Hamburguesas', 'descripcion' => 'Hamburguesas caseras'],
            ['nombre' => 'Postres', 'descripcion' => 'Para cerrar con algo dulce'],
            ['nombre' => 'Bebidas', 'descripcion' => 'Con y sin alcohol'],
        ];

        foreach ($categorias as $categoria) {
            Categoria::updateOrCreate(
                ['nombre' => $categoria['nombre']],
                $categoria + ['activo' => true]
            );
        }
    }
}
