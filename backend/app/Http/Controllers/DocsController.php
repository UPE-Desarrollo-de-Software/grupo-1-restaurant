<?php

namespace App\Http\Controllers;

use Illuminate\Routing\Route;
use Illuminate\Support\Facades\Route as RouteFacade;
use Illuminate\Support\Str;
use Illuminate\View\View;

class DocsController extends Controller
{
    /**
     * Orden en que se muestran las secciones de la documentación.
     *
     * @var list<string>
     */
    private const ORDEN_SECCIONES = [
        'Autenticación',
        'Usuarios y roles',
        'Categorías',
        'Productos',
        'Ingredientes',
        'Sesiones de clientes',
        'Pedidos',
        'Operación de mesa (mozo)',
        'Otras',
    ];

    /**
     * Sección a la que pertenece cada endpoint, indexada por el corto
     * nombre del controller (la ruta closure usa 'Closure').
     *
     * @var array<string, string>
     */
    private const SECCIONES = [
        'AuthController' => 'Autenticación',
        'UsuarioController' => 'Usuarios y roles',
        'RolController' => 'Usuarios y roles',
        'CategoriaController' => 'Categorías',
        'ProductoController' => 'Productos',
        'IngredienteController' => 'Ingredientes',
        'SesionController' => 'Sesiones de clientes',
        'PedidoController' => 'Pedidos',
        'MozoController' => 'Operación de mesa (mozo)',
        'MesaController' => 'Operación de mesa (mozo)',
        'Closure' => 'Autenticación',
    ];

    /**
     * Descripción de cada endpoint, indexada por "Controller@método".
     * Si falta una, la vista muestra la acción en gris para completarla.
     *
     * @var array<string, string>
     */
    private const DESCRIPCIONES = [
        'AuthController@login' => 'Iniciar sesión como empleado (email + password) y obtener un token.',
        'AuthController@logout' => 'Cerrar la sesión del empleado: borra todos sus tokens.',
        'Closure' => 'Devuelve los datos del usuario autenticado según el token enviado.',
        'UsuarioController@register' => 'Crear un usuario empleado con su rol (solo gerente).',
        'UsuarioController@index' => 'Listar todos los usuarios empleados, con su rol y estado.',
        'UsuarioController@show' => 'Obtener un usuario empleado por ID, con su
        rol y estado.',
        'UsuarioController@update' => 'Actualizar un usuario empleado por ID (solo gerente).',
        'UsuarioController@destroy' => 'Desactivar un usuario empleado por ID (solo gerente).',
        'UsuarioController@reactivar' => 'Reactivar un usuario empleado por ID (solo gerente).',
        'RolController@index' => 'Listar los roles disponibles, para el alta de usuarios en el front.',
        'CategoriaController@index' => 'Listar todas las categorías.',
        'CategoriaController@show' => 'Obtener una categoría por ID.',
        'CategoriaController@store' => 'Crear una categoría.',
        'CategoriaController@update' => 'Actualizar una categoría.',
        'CategoriaController@destroy' => 'Eliminar una categoría.',
        'ProductoController@index' => 'Listar todos los productos.',
        'ProductoController@show' => 'Obtener un producto por ID, con sus ingredientes.',
        'ProductoController@store' => 'Crear un producto.',
        'ProductoController@update' => 'Actualizar un producto.',
        'ProductoController@destroy' => 'Eliminar un producto.',
        'IngredienteController@index' => 'Listar todos los ingredientes.',
        'IngredienteController@show' => 'Obtener un ingrediente por ID.',
        'IngredienteController@store' => 'Crear un ingrediente.',
        'IngredienteController@update' => 'Actualizar un ingrediente.',
        'IngredienteController@destroy' => 'Eliminar un ingrediente.',
        'SesionController@loginConCodigoGrupal' => 'Entrar a la sesión del grupo con el código grupal de 4 dígitos y obtener un token de cliente.',
        'SesionController@detalles' => 'Ver la sesión actual: mesas, mozo, estado y horarios.',
        'SesionController@logout' => 'Salir de la sesión como cliente: borra sus tokens.',
        'PedidoController@agregarProducto' => 'Agregar uno o varios productos al pedido en selección de la sesión, con ingredientes opcionales y su precio adicional.',
        'PedidoController@enviarPedido' => 'Enviar el pedido en selección de la sesión: lo pasa a "recibido" para que llegue a cocina.',
        'MozoController@crearSesion' => 'Crear una sesión en una o más mesas y generar el código grupal.',
        'MozoController@cerrarSesion' => 'Cerrar una sesión propia: la marca como cerrada y saca a los clientes.',
        'MozoController@verDetalles' => 'Ver el detalle de una sesión: mesas, clientes activos y estado.',

    ];

    /**
     * Portada del backend: lista los endpoints declarados en routes/api.php
     * leyendo el router, así nunca se desincroniza con las rutas reales.
     *
     * @return array{secciones: list<array{titulo: string, endpoints: list<array{metodo: string, uri: string, descripcion: ?string, accion: string, acceso: string, accesoClase: string}>}>, total: int, baseUrl: string}
     */
    public function index(): View
    {
        $porSeccion = [];

        foreach (RouteFacade::getRoutes() as $ruta) {
            if (! str_starts_with($ruta->uri(), 'api/')) {
                continue;
            }

            $metodos = array_values(array_diff($ruta->methods(), ['HEAD', 'OPTIONS']));

            if ($metodos === []) {
                continue;
            }

            $accion = $this->accionCorta($ruta);
            $seccion = self::SECCIONES[Str::before($accion, '@')] ?? 'Otras';
            $acceso = $this->acceso($ruta->gatherMiddleware());

            $porSeccion[$seccion][] = [
                'metodo' => $metodos[0],
                'uri' => '/'.$ruta->uri(),
                'descripcion' => self::DESCRIPCIONES[$accion] ?? null,
                'accion' => $accion,
                'acceso' => $acceso['texto'],
                'accesoClase' => $acceso['clase'],
            ];
        }

        $secciones = [];

        foreach (self::ORDEN_SECCIONES as $titulo) {
            if (isset($porSeccion[$titulo])) {
                $secciones[] = [
                    'titulo' => $titulo,
                    'endpoints' => $porSeccion[$titulo],
                ];
            }
        }

        return view('welcome', [
            'secciones' => $secciones,
            'total' => array_sum(array_map(fn (array $s) => count($s['endpoints']), $secciones)),
            'baseUrl' => url('/api'),
        ]);
    }

    /**
     * Acción corta de la ruta: "Controller@método" o "Closure".
     */
    private function accionCorta(Route $ruta): string
    {
        $accion = $ruta->getActionName();

        if ($accion === 'Closure') {
            return 'Closure';
        }

        [$controller, $metodo] = array_pad(explode('@', $accion, 2), 2, '__sin_metodo');

        return class_basename($controller).'@'.$metodo;
    }

    /**
     * Etiqueta de acceso según los middlewares de la ruta.
     *
     * @param  array<int, mixed>  $middleware
     * @return array{texto: string, clase: string}
     */
    private function acceso(array $middleware): array
    {
        $etiquetas = [
            'gerente' => ['texto' => 'Gerente', 'clase' => 'gerente'],
            'mozo' => ['texto' => 'Mozo', 'clase' => 'mozo'],
            'cliente' => ['texto' => 'Cliente', 'clase' => 'cliente'],
            'auth:sanctum' => ['texto' => 'Empleado', 'clase' => 'empleado'],
        ];

        foreach ($etiquetas as $alias => $etiqueta) {
            if (in_array($alias, $middleware, true)) {
                return $etiqueta;
            }
        }

        return ['texto' => 'Público', 'clase' => 'publico'];
    }
}
