<?php

namespace Database\Seeders;

use App\Models\Categoria;
use App\Models\Ingrediente;
use App\Models\Producto;
use Illuminate\Database\Seeder;

class ProductoSeeder extends Seeder
{
    /**
     * Crea los productos y los asocia a sus ingredientes en la tabla
     * pivot `producto_ingrediente`. Requiere CategoriaSeeder e
     * IngredienteSeeder corridos antes. Idempotente por (categoría, nombre).
     */
    public function run(): void
    {
        /** @var array<string, int> $categorias */
        $categorias = Categoria::pluck('id', 'nombre')->all();
        /** @var array<string, int> $ingredientes */
        $ingredientes = Ingrediente::pluck('id', 'nombre')->all();

        /**
         * @var array<string, list<array{nombre: string, descripcion: string, precio: int, ingredientes: list<string>}>> $menu
         */
        $menu = [
            'Entradas' => [
                ['nombre' => 'Empanada de carne', 'descripcion' => 'Empanada de carne cortada a cuchillo, al horno', 'precio' => 2200, 'ingredientes' => ['Carne picada', 'Cebolla', 'Huevo']],
                ['nombre' => 'Provoleta', 'descripcion' => 'Provolone a la parrilla con orégano', 'precio' => 7500, 'ingredientes' => ['Provolone', 'Orégano']],
                ['nombre' => 'Papas fritas', 'descripcion' => 'Porción de papas fritas para compartir', 'precio' => 6000, 'ingredientes' => ['Papas fritas']],
            ],
            'Platos principales' => [
                ['nombre' => 'Milanesa napolitana', 'descripcion' => 'Milanesa de ternera con jamón, muzzarella y salsa de tomate', 'precio' => 14500, 'ingredientes' => ['Milanesa de ternera', 'Jamón cocido', 'Muzzarella', 'Salsa de tomate']],
                ['nombre' => 'Milanesa con papas fritas', 'descripcion' => 'Milanesa de ternera con guarnición de papas fritas', 'precio' => 13000, 'ingredientes' => ['Milanesa de ternera', 'Papas fritas']],
                ['nombre' => 'Ensalada mixta', 'descripcion' => 'Lechuga, tomate y cebolla', 'precio' => 5500, 'ingredientes' => ['Lechuga', 'Tomate', 'Cebolla']],
            ],
            'Pizzas' => [
                ['nombre' => 'Pizza muzzarella', 'descripcion' => 'Salsa de tomate y muzzarella', 'precio' => 11000, 'ingredientes' => ['Masa de pizza', 'Salsa de tomate', 'Muzzarella']],
                ['nombre' => 'Pizza fugazzeta', 'descripcion' => 'Cebolla y muzzarella', 'precio' => 12500, 'ingredientes' => ['Masa de pizza', 'Muzzarella', 'Cebolla']],
                ['nombre' => 'Pizza napolitana', 'descripcion' => 'Muzzarella, rodajas de tomate y albahaca', 'precio' => 13000, 'ingredientes' => ['Masa de pizza', 'Salsa de tomate', 'Muzzarella', 'Tomate', 'Albahaca']],
            ],
            'Hamburguesas' => [
                ['nombre' => 'Hamburguesa clásica', 'descripcion' => 'Medallón de carne, lechuga y tomate', 'precio' => 9500, 'ingredientes' => ['Pan de hamburguesa', 'Medallón de carne', 'Lechuga', 'Tomate']],
                ['nombre' => 'Hamburguesa completa', 'descripcion' => 'Medallón, jamón, muzzarella, huevo, lechuga y tomate', 'precio' => 12000, 'ingredientes' => ['Pan de hamburguesa', 'Medallón de carne', 'Jamón cocido', 'Muzzarella', 'Huevo', 'Lechuga', 'Tomate']],
            ],
            'Postres' => [
                ['nombre' => 'Flan con dulce de leche', 'descripcion' => 'Flan casero con dulce de leche y crema', 'precio' => 5500, 'ingredientes' => ['Dulce de leche', 'Crema']],
                ['nombre' => 'Helado de crema', 'descripcion' => 'Copa de helado de crema', 'precio' => 4500, 'ingredientes' => ['Helado de crema']],
            ],
            'Bebidas' => [
                ['nombre' => 'Agua mineral', 'descripcion' => 'Botella de 500 ml, con o sin gas', 'precio' => 2000, 'ingredientes' => []],
                ['nombre' => 'Gaseosa', 'descripcion' => 'Línea Coca-Cola, 500 ml', 'precio' => 2800, 'ingredientes' => []],
                ['nombre' => 'Cerveza artesanal', 'descripcion' => 'Pinta de 500 ml', 'precio' => 5000, 'ingredientes' => []],
                ['nombre' => 'Copa de vino tinto', 'descripcion' => 'Malbec de la casa', 'precio' => 4500, 'ingredientes' => []],
            ],
        ];

        foreach ($menu as $nombreCategoria => $productos) {
            foreach ($productos as $datos) {
                $producto = Producto::updateOrCreate(
                    [
                        'categoria_id' => $categorias[$nombreCategoria],
                        'nombre' => $datos['nombre'],
                    ],
                    [
                        'descripcion' => $datos['descripcion'],
                        'precio' => $datos['precio'],
                        'imagen' => null,
                        'disponible' => true,
                    ]
                );

                $producto->ingredientes()->sync(
                    array_map(fn (string $nombre): int => $ingredientes[$nombre], $datos['ingredientes'])
                );
            }
        }
    }
}
