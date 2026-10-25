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
        'Promociones',
        'Ingredientes',
        'Mesas',
        'Reservas',
        'Pedidos',
        'Clientes',
        'Reportes',
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
        'PromocionController' => 'Promociones',
        'IngredienteController' => 'Ingredientes',
        'MesaController' => 'Mesas',
        'ConfiguracionController' => 'Mesas',
        'PedidoController' => 'Pedidos',
        'ClienteController' => 'Clientes',
        'ReservaController' => 'Reservas',
        'DashboardController' => 'Reportes',
        'HistorialComandaController' => 'Reportes',
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
        'PromocionController@index' => 'Listar todas las promociones del catálogo.',
        'PromocionController@show' => 'Obtener una promoción por ID.',
        'PromocionController@store' => 'Crear una promoción (tipo porcentaje, monto_fijo, precio_fijo o 2x1). El alcance en la carta se setea desde el plato (promocion_id).',
        'PromocionController@update' => 'Actualizar una promoción. Los topes por tipo y la ventana de fechas los valida el dominio (422).',
        'PromocionController@destroy' => 'Eliminar una promoción. Si ya se aplicó en pedidos no se puede borrar (422): desactivala.',
        'IngredienteController@index' => 'Listar todos los ingredientes.',
        'IngredienteController@show' => 'Obtener un ingrediente por ID.',
        'IngredienteController@store' => 'Crear un ingrediente con su precio adicional de catálogo.',
        'IngredienteController@update' => 'Actualizar un ingrediente.',
        'IngredienteController@destroy' => 'Eliminar un ingrediente.',
        'MesaController@index' => 'Listar todas las mesas vivas, con su mozo responsable y estado.',
        'MesaController@disponibles' => 'Listar las mesas libres (sin pedido activo ni reserva).',
        'MesaController@show' => 'Obtener una mesa por ID (las destruidas responden "no encontrada").',
        'MesaController@store' => 'Crear una mesa dinámica con su código de acceso (6 dígitos) y capacidad. Valida el AFORO del lugar y el TOPE de mesas (CONFIG_MESA: aforo = Σ capacidad×cantidad, máximo de mesas = Σ cantidad); la crea el mozo cuando hace falta (p. ej. al armar las mesas de una reserva que llegó).',
        'MesaController@update' => 'Actualizar capacidad, estado y mozo de la mesa. El código de acceso nunca cambia y la capacidad nueva vuelve a validar el aforo.',
        'MesaController@destroy' => 'Destruir la mesa (borrado lógico): para la app deja de existir y su código deja de valer; los pedidos históricos conservan su FK. Antes de destruirla cancela sus reservas PENDIENTES y responde { message, reservas_canceladas } con el conteo.',
        'CocinaController@index' => 'Cola de cocina (permiso preparar_pedidos): { pedidos: [...] } con los pedidos en "enviado" (por preparar) y "en_preparacion" (en cocción) de todas las mesas, cada uno con sus líneas (plato, ingredientes, promo aplicada) y su mesa, en orden de llegada. Los "listo" ya no aparecen: los retira el mozo.',
        'CocinaController@cambiarEstado' => 'Avanzar la preparación (PUT /api/cocina/pedidos/{id}/estado, permiso preparar_pedidos): BODY { estado: "en_preparacion" | "listo" } (422 si viene otro estado o el salto no corresponde). Solo ese tramo, sin saltos y sin cancel: enviado → en_preparacion → listo. Solo cambia el estado, sin otros efectos. Responde { mensaje, pedido } (404 si el id no existe o no es numérico).',
        'PedidoController@pedidoActivo' => 'Pedidos NO finalizados de la mesa con sus líneas: { pedidos: [...] } (vacío si no hay; hoy hay varios por mesa, uno por comensal).',
        'PedidoController@agregarProducto' => 'Alta de líneas del mozo. Sin pedido_id crea una RAÍZ nueva (la orden nueva de esa persona); con pedido_id agrega a ese pedido si está en curso. Las líneas del mozo nacen confirmadas. Soporta agregar y excluir ingredientes según los flags del plato.',
        'PedidoController@confirmar' => 'Gate de envío manual del mozo (fallback del auto-envío del comensal): chequea que ninguna línea siga sin confirmar (o forzar: true) y deja el pedido en estado "confirmado".',
        'PedidoController@enviarPedido' => '2do paso del envío: pasa el pedido "confirmado" a "enviado" (hacia cocina).',
        'PedidoController@cambiarEstado' => 'Tramo del MOZO del flujo (PUT /api/pedidos/{pedido}/estado): BODY { estado } admite solo en_curso (reabrir), entregado, cerrado o cancelado (422 con otro, p. ej. en_preparacion o listo: esos los avanza la cocina). Avanza listo → entregado → cerrado y cancela desde cualquier estado no final (el cancel es exclusivo del mozo). NO toca la mesa: la visita termina cuando el mozo la cierra tras el pago (POST /api/mesas/{mesa}/cerrar).',
        'ConfiguracionController@show' => 'Leer la configuración del restaurante: la composición de piezas del salón (config_mesas: [{cantidad, capacidad}]) con el aforo derivado (Σ capacidad×cantidad) y el tope de mesas (Σ cantidad).',
        'ConfiguracionController@update' => 'Reemplazar la composición CONFIG_MESA del salón (REPLACE-ALL). BODY JSON: { config_mesas: [{cantidad, capacidad}, ...] }. El aforo nuevo no puede quedar por debajo de la capacidad que ya ocupan las mesas vivas ni el tope de mesas por debajo de las vivas (422; solo gerente).',
        'MesaController@ocupar' => 'Marcar la mesa como ocupada. NO regenera el código de acceso: el código es estable desde el alta hasta que la mesa se destruya.',
        'MesaController@cerrar' => 'Cerrar la VISITA (permiso tomar_pedidos): el cliente pagó la cuenta y el mozo termina el servicio → borrado lógico de la mesa (su código deja de valer y se cancelan reservas PENDIENTES legadas, igual que DELETE). Exige CERO pedidos activos: si quedan → 422 "No se puede cerrar la mesa: quedan pedidos activos...". Responde { message, reservas_canceladas }. Si la mesa no existe o ya se cerró → 404.',
        'MesaController@agrupar' => 'Agrupar mesas para el resumen conjunto de lectura (no fusiona pedidos). Los códigos NO cambian: nadie tiene que re-entrar.',
        'MesaController@desagrupar' => 'Sacar las mesas del grupo de lectura.',
        'MesaController@resumen' => 'Resumen de lectura de la mesa: TODOS sus pedidos activos con sus líneas y su confirmado por línea (incluye el grupo si la mesa tiene).',
        'MesaController@cuenta' => 'Cuenta dividida de la mesa en PARTES por pedido raíz (raíz + sus hijos = lo que paga cada quien), cortada por ocupada_desde. Sirve aunque la mesa ya se haya destruido.',
        'ClienteController@acceder' => 'Acceso del comensal (público): valida el codigo_acceso de la mesa y la devuelve. El front guarda el código y lo manda en cada request como Bearer; no hay token de cliente.',
        'ClienteController@pedidos' => 'Resumen de la mesa (todos sus pedidos activos con sus líneas), entrando con Bearer codigo_acceso.',
        'ClienteController@agregar' => 'Agregar SUS líneas: crea su pedido RAÍZ, sigue uno en curso (pedido_id) o crea un HIJO de su primer pedido (pedido_padre_id). Las líneas nacen sin confirmar.',
        'ClienteController@confirmar' => 'Confirmar las líneas de SU pedido: { pedido_id, detalle_ids? } (sin detalle_ids, todas las del pedido). El pedido debe ser de la mesa del código. AUTO-ENVÍO EN LOTE: cuando TODOS los pedidos de la mesa tienen todas sus líneas confirmadas, salen juntos a cocina (estado "enviado"); si queda alguno sin confirmar, ninguno sale.',
        'ClienteController@desconfirmar' => 'Deshacer la confirmación de las líneas de SU pedido mientras siga en curso (un pedido ya enviado no admite deshacer).',
        'ClienteController@cuenta' => 'Cuenta dividida de la mesa en partes por pedido raíz: el comensal identifica SU parte con el pedido raíz que guardó en su dispositivo.',
        'ReservaController@store' => 'Alta de reserva desde el restaurante (mozo/gerente). BODY JSON: { contacto_solicitante, fecha (YYYY-MM-DD), hora (HH:MM o HH:MM:SS), cantPersonas }. NO lleva mesa: el sistema elige la combinación de capacidades contra el inventario (CONFIG_MESA menos las reservas PENDIENTES cuyo intervalo [hora, hora+30min] se solapa con el pedido) y la guarda en reserva_inventario. Reglas (422): al menos 2 horas de anticipación; si no hay combinación que aloje a cantPersonas → "No hay disponibilidad para N personas en ese horario". Respuesta 201: { mensaje, reserva (con su inventario) }. El cliente no tiene cancelación pública: la cancela un empleado con permiso gestionar_reservas.',
        'ReservaController@solicitarWeb' => 'Alta de reserva del cliente por la web (PÚBLICO con throttle 60/min, sin token). BODY JSON: { contacto_solicitante, fecha, hora, cantPersonas } (sin mesa_id: no existe elección de mesa). Misma lógica que el alta del empleado: combinación de capacidades contra el inventario y misma regla de 2 horas de anticipación; 422 "No hay disponibilidad para N personas en ese horario" si no entra. Respuesta 201: { mensaje, reserva } — el front debe guardar reserva.id (el envío por mail está pendiente).',
        'ReservaController@disponibilidad' => 'Disponibilidad de un horario (PÚBLICO con throttle). Query: ?fecha=YYYY-MM-DD&hora=HH:MM. Respuesta 200: { fecha, inicio, fin (ventana de 30 min), disponible: [{capacidad, cantidad}] (capacidades libres después de los holds pendientes solapados), aforo_disponible (Σ capacidad×cantidad). Antes de responder vence las reservas vencidas (pasan a no_asistio). Reemplaza al antiguo GET /cliente/reservas/mesas.',
        'ReservaController@index' => 'Agenda de reservas (empleado con permiso gestionar_reservas) con filtros opcionales combinables: ?estado=pendiente|cancelada|finalizada|no_asistio&fecha=YYYY-MM-DD&mesa_id=N (legado). Respuesta 200: array de reservas con su inventario de capacidades (y su mesa si es legada); si no hay nada: 200 {"message":"No se encontraron reservas"}. La fecha con formato distinto a YYYY-MM-DD responde 422.',
        'ReservaController@show' => 'Detalle de una reserva con su inventario (capacidades asignadas) y su mesa si tiene. 200: reserva completa; si no existe: 404 { "message": "Reserva no encontrada" }.',
        'ReservaController@cancelar' => 'Cancelar una reserva (empleado con permiso gestionar_reservas). PATCH sin body. Transición pendiente → cancelada: cualquier reserva PENDIENTE se puede cancelar a cualquier hora (incluso antes de la hora reservada) y su hold de inventario queda libre. Si ya no está pendiente → 422 "Solo se pueden cancelar reservas con estado pendiente". Respuesta 200: { mensaje: "Reserva cancelada correctamente", reserva }.',
        'ReservaController@finalizar' => 'Registrar la LLEGADA del cliente (empleado con permiso gestionar_reservas): pendiente → finalizada. PATCH sin body. La reserva muere acá: su hold de inventario queda libre y el campo inventario de la respuesta indica qué capacidades debe preparar el mozo (a partir de ahí arma las mesas normales con POST /mesas). NO exige hora pasada (puede llegar temprano); exige estado PENDIENTE (si no → 422). Si nadie llega, la reserva vence sola después de los 30 min y pasa a no_asistio. Respuesta 200: { mensaje: "Llegada registrada: reserva finalizada e inventario liberado", reserva }.',
        'ReservaController@inasistio' => 'Registrar inasistencia (empleado con permiso gestionar_reservas): pendiente → no_asistio (el cliente no vino). PATCH sin body. Exige estado PENDIENTE y que ya haya pasado la hora de la reserva (si no → 422 "Aún no llegó la hora de la reserva"). Libera el hold de inventario. Respuesta 200: { mensaje: "Inasistencia registrada", reserva }.',
        'DashboardController@index' => 'Dashboard de estadísticas (permiso ver_dashboard, solo Gerente). Query opcionales ?desde=YYYY-MM-DD&hasta=YYYY-MM-DD (default hoy; máximo 366 días → 422). Respuesta 200: { periodo, ventas (cantidad_pedidos, total, ticket_promedio de entregado+cerrado), pedidos_por_estado (los 7 estados del período), platos_mas_vendidos (top 10 por unidades), ocupacion_actual (mesas por estado, cubiertos ocupados, aforo de CONFIG_MESA y porcentaje), reservas_hoy (por estado de HOY + total_personas_pendientes) }.',
        'HistorialComandaController@index' => 'Historial de comandas paginado (permiso ver_historial_comandas: Gerente y Cocina). La comanda = pedido con sus líneas y su mesa aunque la mesa ya se haya destruido. Filtros opcionales combinables: ?desde&hasta&estado (los 8 estados del DER, incluido "listo"; SIN filtro lista solo finalizados: cerrado+cancelado)&mesa_id&page&per_page (default 20, máx 100). Respuesta 200: el paginador de Laravel directo (current_page, data, per_page, total, last_page).',
        'HistorialComandaController@show' => 'Comanda única del historial por ID (extravíos; mismo shape que un item del listado: cabecera + mesa + líneas). Si no existe → 404 { "message": "Comanda no encontrada" }.',
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
