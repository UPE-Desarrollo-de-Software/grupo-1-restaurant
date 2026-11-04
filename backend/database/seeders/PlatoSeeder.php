<?php

namespace Database\Seeders;

use App\Models\Categoria;
use App\Models\Ingrediente;
use App\Models\Plato;
use Illuminate\Database\Seeder;

/**
 * Platos del menú y sus ingredientes (DER v2.1: PLATO_INGREDIENTE).
 *
 * Requiere CategoriaSeeder e IngredienteSeeder corridos antes.
 * Idempotente por (categoría, nombre).
 *
 * Por cada plato se definen dos listas:
 *  - `ingredientes`: vienen en el plato (por_defecto = true). La
 *    mayoría se puede excluir (opcional = true); los estructurales
 *    (masa, pan, proteína base) y las bebidas quedan con
 *    opcional = false. Todo plato tiene al menos uno.
 *  - `extras`: no vienen en el plato (por_defecto = false) pero se
 *    pueden agregar (opcional = true) y cobran precioAdicional.
 *    Algunos platos no tienen extras.
 */
class PlatoSeeder extends Seeder
{
    /**
     * Ingredientes estructurales: no se pueden excluir ni agregar
     * (opcional = false). Incluye las bases de los platos (masa, pan,
     * proteínas) y las bebidas (el ingrediente default de una bebida
     * es la bebida misma: no tiene sentido excluirla).
     *
     * @var list<string>
     */
    private const NO_MODIFICABLES = [
        'Masa de pizza',
        'Pan de hamburguesa',
        'Milanesa de ternera',
        'Medallón de carne',
        'Agua mineral',
        'Gaseosa',
        'Cerveza artesanal',
        'Vino tinto',
    ];

    public function run(): void
    {
        /** @var array<string, int> $categorias */
        $categorias = Categoria::pluck('id', 'nombre')->all();
        /** @var array<string, int> $ingredientes */
        $ingredientes = Ingrediente::pluck('id', 'nombre')->all();

        /**
         * @var array<string, list<array{nombre: string, descripcion: string, precio: int, ingredientes: list<string>, extras?: list<string>}>> $menu
         */
        $menu = [
            'Entradas' => [
                ['nombre' => 'Empanada de carne', 'descripcion' => 'Empanada de carne cortada a cuchillo, al horno', 'precio' => 2200, 'ingredientes' => ['Carne picada', 'Cebolla', 'Huevo']],
                ['nombre' => 'Provoleta', 'descripcion' => 'Provolone a la parrilla con orégano', 'precio' => 7500, 'ingredientes' => ['Provolone', 'Orégano']],
                ['nombre' => 'Papas fritas', 'descripcion' => 'Porción de papas fritas para compartir', 'precio' => 6000, 'ingredientes' => ['Papas fritas'], 'extras' => ['Queso cheddar', 'Panceta', 'Huevo frito']],
            ],
            'Platos principales' => [
                ['nombre' => 'Milanesa napolitana', 'descripcion' => 'Milanesa de ternera con jamón, muzzarella y salsa de tomate', 'precio' => 14500, 'ingredientes' => ['Milanesa de ternera', 'Jamón cocido', 'Muzzarella', 'Salsa de tomate']],
                ['nombre' => 'Milanesa con papas fritas', 'descripcion' => 'Milanesa de ternera con guarnición de papas fritas', 'precio' => 13000, 'ingredientes' => ['Milanesa de ternera', 'Papas fritas'], 'extras' => ['Huevo frito', 'Queso cheddar']],
                ['nombre' => 'Ensalada mixta', 'descripcion' => 'Lechuga, tomate y cebolla', 'precio' => 5500, 'ingredientes' => ['Lechuga', 'Tomate', 'Cebolla']],
            ],
            'Pizzas' => [
                ['nombre' => 'Pizza muzzarella', 'descripcion' => 'Salsa de tomate y muzzarella', 'precio' => 11000, 'ingredientes' => ['Masa de pizza', 'Salsa de tomate', 'Muzzarella', 'Orégano'], 'extras' => ['Aceitunas', 'Morrón asado', 'Panceta', 'Salchicha']],
                ['nombre' => 'Pizza fugazzeta', 'descripcion' => 'Cebolla y muzzarella', 'precio' => 12500, 'ingredientes' => ['Masa de pizza', 'Muzzarella', 'Cebolla', 'Orégano'], 'extras' => ['Aceitunas', 'Salchicha']],
                ['nombre' => 'Pizza napolitana', 'descripcion' => 'Muzzarella, rodajas de tomate y albahaca', 'precio' => 13000, 'ingredientes' => ['Masa de pizza', 'Salsa de tomate', 'Muzzarella', 'Tomate', 'Albahaca', 'Orégano'], 'extras' => ['Aceitunas', 'Salchicha']],
            ],
            'Hamburguesas' => [
                ['nombre' => 'Hamburguesa clásica', 'descripcion' => 'Medallón de carne, lechuga, tomate y cebolla', 'precio' => 9500, 'ingredientes' => ['Pan de hamburguesa', 'Medallón de carne', 'Lechuga', 'Tomate', 'Cebolla'], 'extras' => ['Queso cheddar', 'Huevo frito', 'Panceta', 'Carne extra']],
                ['nombre' => 'Hamburguesa completa', 'descripcion' => 'Medallón, jamón, muzzarella, huevo, lechuga, tomate y cebolla', 'precio' => 12000, 'ingredientes' => ['Pan de hamburguesa', 'Medallón de carne', 'Jamón cocido', 'Muzzarella', 'Huevo', 'Lechuga', 'Tomate', 'Cebolla'], 'extras' => ['Queso cheddar', 'Panceta', 'Carne extra']],
            ],
            'Postres' => [
                ['nombre' => 'Flan con dulce de leche', 'descripcion' => 'Flan casero con dulce de leche y crema', 'precio' => 5500, 'ingredientes' => ['Dulce de leche', 'Crema']],
                ['nombre' => 'Helado de crema', 'descripcion' => 'Copa de helado de crema', 'precio' => 4500, 'ingredientes' => ['Helado de crema']],
            ],
            'Bebidas' => [
                ['nombre' => 'Agua mineral', 'descripcion' => 'Botella de 500 ml, con o sin gas', 'precio' => 2000, 'ingredientes' => ['Agua mineral']],
                ['nombre' => 'Gaseosa', 'descripcion' => 'Línea Coca-Cola, 500 ml', 'precio' => 2800, 'ingredientes' => ['Gaseosa']],
                ['nombre' => 'Cerveza artesanal', 'descripcion' => 'Pinta de 500 ml', 'precio' => 5000, 'ingredientes' => ['Cerveza artesanal']],
                ['nombre' => 'Copa de vino tinto', 'descripcion' => 'Malbec de la casa', 'precio' => 4500, 'ingredientes' => ['Vino tinto']],
            ],
        ];

        foreach ($menu as $nombreCategoria => $platos) {
            foreach ($platos as $datos) {
                $plato = Plato::updateOrCreate(
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

                $pivot = [];

                // Vienen en el plato: por_defecto = true.
                foreach ($datos['ingredientes'] as $nombreIngrediente) {
                    $pivot[$ingredientes[$nombreIngrediente]] = [
                        'opcional' => ! in_array($nombreIngrediente, self::NO_MODIFICABLES, true),
                        'por_defecto' => true,
                    ];
                }

                // Extras: no vienen, pero se pueden agregar.
                foreach ($datos['extras'] ?? [] as $nombreExtra) {
                    $pivot[$ingredientes[$nombreExtra]] = [
                        'opcional' => true,
                        'por_defecto' => false,
                    ];
                }

                $plato->ingredientes()->sync($pivot);
            }
        }
    }
}
