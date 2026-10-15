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
        'Platos',
        'Ingredientes',
        'Mesas',
        'Pedidos',
        'Clientes',
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
        'PlatoController' => 'Platos',
        'IngredienteController' => 'Ingredientes',
        'MesaController' => 'Mesas',
        'ConfiguracionController' => 'Mesas',
        'PedidoController' => 'Pedidos',
        'ClienteController' => 'Clientes',
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
        'PlatoController@index' => 'Listar todos los platos disponibles, con su categoría.',
        'PlatoController@show' => 'Obtener un plato por ID, con sus ingredientes y flags opcional/por_defecto.',
        'PlatoController@store' => 'Crear un plato con su categoría, promo de catálogo (opcional) e ingredientes.',
        'PlatoController@update' => 'Actualizar un plato (incluye los flags de sus ingredientes).',
        'PlatoController@destroy' => 'Eliminar un plato.',
        'IngredienteController@index' => 'Listar todos los ingredientes.',
        'IngredienteController@show' => 'Obtener un ingrediente por ID.',
        'IngredienteController@store' => 'Crear un ingrediente con su precio adicional de catálogo.',
        'IngredienteController@update' => 'Actualizar un ingrediente.',
        'IngredienteController@destroy' => 'Eliminar un ingrediente.',
        'MesaController@index' => 'Listar todas las mesas vivas, con su mozo responsable y estado.',
        'MesaController@disponibles' => 'Listar las mesas libres (sin pedido activo ni reserva).',
        'MesaController@show' => 'Obtener una mesa por ID (las destruidas responden "no encontrada").',
        'MesaController@store' => 'Crear una mesa dinámica con su código de acceso (6 dígitos) y capacidad. Valida el AFORO del lugar (PARAMETRO.capacidad_total); la crea el mozo o la reserva.',
        'MesaController@update' => 'Actualizar capacidad, estado y mozo de la mesa. El código de acceso nunca cambia y la capacidad nueva vuelve a validar el aforo.',
        'MesaController@destroy' => 'Destruir la mesa (borrado lógico): para la app deja de existir y su código deja de valer; los pedidos históricos conservan su FK.',
        'PedidoController@pedidoActivo' => 'Pedidos NO finalizados de la mesa con sus líneas: { pedidos: [...] } (vacío si no hay; hoy hay varios por mesa, uno por comensal).',
        'PedidoController@agregarProducto' => 'Alta de líneas del mozo. Sin pedido_id crea una RAÍZ nueva (la orden nueva de esa persona); con pedido_id agrega a ese pedido si está en curso. Las líneas del mozo nacen confirmadas. Soporta agregar y excluir ingredientes según los flags del plato.',
        'PedidoController@confirmar' => '1er paso del envío: gate de que ninguna línea siga sin confirmar (o forzar: true) y deja el pedido en estado "confirmado".',
        'PedidoController@enviarPedido' => '2do paso del envío: pasa el pedido "confirmado" a "enviado" (hacia cocina).',
        'PedidoController@cambiarEstado' => 'Avanzar el pedido por el flujo del DER (confirmado → enviado → en_preparacion → entregado → cerrado), reabrirlo (confirmado → en_curso) o cancelarlo. Al llegar a un estado final, si es el último pedido activo la mesa queda destruida (borrado lógico).',
        'ConfiguracionController@show' => 'Leer la configuración del restaurante: el aforo capacidad_total de la tabla PARAMETRO.',
        'ConfiguracionController@update' => 'Actualizar el aforo del lugar. No puede quedar por debajo de la capacidad que ya ocupan las mesas vivas (solo gerente).',
        'MesaController@ocupar' => 'Marcar la mesa como ocupada. NO regenera el código de acceso: el código es estable desde el alta hasta que la mesa se destruya.',
        'MesaController@agrupar' => 'Agrupar mesas para el resumen conjunto de lectura (no fusiona pedidos). Los códigos NO cambian: nadie tiene que re-entrar.',
        'MesaController@desagrupar' => 'Sacar las mesas del grupo de lectura.',
        'MesaController@resumen' => 'Resumen de lectura de la mesa: TODOS sus pedidos activos con sus líneas y su confirmado por línea (incluye el grupo si la mesa tiene).',
        'MesaController@cuenta' => 'Cuenta dividida de la mesa en PARTES por pedido raíz (raíz + sus hijos = lo que paga cada quien), cortada por ocupada_desde. Sirve aunque la mesa ya se haya destruido.',
        'ClienteController@acceder' => 'Acceso del comensal (público): valida el codigo_acceso de la mesa y la devuelve. El front guarda el código y lo manda en cada request como Bearer; no hay token de cliente.',
        'ClienteController@pedidos' => 'Resumen de la mesa (todos sus pedidos activos con sus líneas), entrando con Bearer codigo_acceso.',
        'ClienteController@agregar' => 'Agregar SUS líneas: crea su pedido RAÍZ, sigue uno en curso (pedido_id) o crea un HIJO de su primer pedido (pedido_padre_id). Las líneas nacen sin confirmar.',
        'ClienteController@confirmar' => 'Confirmar las líneas de SU pedido: { pedido_id, detalle_ids? } (sin detalle_ids, todas las del pedido). El pedido debe ser de la mesa del código.',
        'ClienteController@desconfirmar' => 'Deshacer la confirmación de las líneas de SU pedido mientras siga en curso.',
        'ClienteController@cuenta' => 'Cuenta dividida de la mesa en partes por pedido raíz: el comensal identifica SU parte con el pedido raíz que guardó en su dispositivo.',
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
     * La autorización es por permiso (`permiso:nombre`, tabla
     * ROL_PERMISO, DER v2.2). El badge muestra el rol mínimo que tiene
     * ese permiso según RolSeeder.
     *
     * @param  array<int, mixed>  $middleware
     * @return array{texto: string, clase: string}
     */
    private function acceso(array $middleware): array
    {
        $etiquetas = [
            // Alias `cliente`: rutas del comensal con Bearer
            // codigo_acceso (sin Sanctum); prioridad sobre "Empleado".
            'cliente' => ['texto' => 'Cliente', 'clase' => 'cliente'],
            'auth:sanctum' => ['texto' => 'Empleado', 'clase' => 'empleado'],
        ];

        // Permisos exclusivos del gerente.
        $gerente = [
            'permiso:gestionar_usuarios',
            'permiso:gestionar_roles',
            'permiso:gestionar_categorias',
            'permiso:gestionar_platos',
            'permiso:gestionar_ingredientes',
            'permiso:gestionar_promociones',
            'permiso:gestionar_mesas',
        ];

        // Permisos que también tiene el mozo.
        $mozo = [
            'permiso:tomar_pedidos',
            'permiso:gestionar_reservas',
        ];

        foreach ($gerente as $permiso) {
            if (in_array($permiso, $middleware, true)) {
                return ['texto' => 'Gerente', 'clase' => 'gerente'];
            }
        }

        foreach ($mozo as $permiso) {
            if (in_array($permiso, $middleware, true)) {
                return ['texto' => 'Mozo', 'clase' => 'mozo'];
            }
        }

        foreach ($etiquetas as $alias => $etiqueta) {
            if (in_array($alias, $middleware, true)) {
                return $etiqueta;
            }
        }

        return ['texto' => 'Público', 'clase' => 'publico'];
    }
}
