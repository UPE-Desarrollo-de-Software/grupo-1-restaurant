<?php

namespace App\Services;

use App\Models\Mesa;
use App\Models\Pedido;
use App\Repositories\DetallePedidoRepository;
use App\Repositories\MesaRepository;
use App\Repositories\PedidoRepository;
use App\Repositories\PlatoRepository;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * PEDIDO — servicio de dominio (arquitectura hexagonal: capa Service
 * sobre los Repositories Pedido/DetallePedido/Mesa/Plato).
 *
 * Reglas del DER v2.2 (rebote de los profes):
 *  - VARIOS pedidos activos por mesa: cada comensal que entra con el
 *    código tiene el SUYO (un pedido por comensal); la regla "1 pedido
 *    no-finalizado por mesa" se eliminó.
 *  - Relación unitaria PEDIDO→PEDIDO: si alguien repite, su pedido
 *    nuevo lleva `pedido_padre_id` apuntando al PRIMERO que hizo
 *    (raíz; profundidad 2). Si el padre sigue `en_curso`, hay que
 *    agrandar ese pedido (pedido_id), no crear otro.
 *  - `confirmado` (gate) vive en DETALLE_PEDIDO: las líneas del
 *    cliente nacen en false, las del mozo en true; cuando TODOS los
 *    pedidos de la mesa están confirmados, salen juntos a cocina
 *    (en_curso → enviado, lote). El mozo conserva el envío manual
 *    (confirmarResumen con gate/forzar + enviarPedido) como fallback.
 *  - ESTADOS (8): el tramo de la cocina lo avanza la cocina
 *    (enviado → en_preparacion → listo, permiso preparar_pedidos) y
 *    el resto el mozo (listo → entregado → cerrado; cancelar desde
 *    cualquier no final, exclusivo del mozo).
 *  - Estados finales (cerrado/cancelado): NO tocan la mesa; la
 *    visita termina cuando el mozo la cierra tras el PAGO
 *    (POST /mesas/{mesa}/cerrar, ver MesaService::cerrarVisita).
 *
 * Fórmula de línea (cuadro de notas del DER):
 *   subtotal = cantidad × (precio_lista + Σ precio_adicional de
 *              agregados) − descuento   (motor de promociones
 *              integrado: ver PLAN-promociones.md)
 */
class PedidoService
{
    public function __construct(
        private MesaRepository $mesas,
        private PedidoRepository $pedidos,
        private DetallePedidoRepository $detalles,
        private PlatoRepository $platos,
        private PromocionService $promociones,
    ) {}

    // ==================== ALTA DE LÍNEAS ====================

    /**
     * Agrega líneas a un pedido de la mesa.
     *
     * Destino (en este orden):
     *  - `pedidoId`: agrega a ESE pedido (debe ser de esta mesa y estar
     *    `en_curso`);
     *  - `pedidoPadreId`: crea un pedido HIJO colgando de la raíz
     *    indicada (la raíz debe ser de esta mesa, ser raíz y no estar
     *    `en_curso`);
     *  - ninguno: crea un pedido RAÍZ nuevo (la orden nueva de esa
     *    persona / del mozo).
     *
     * `origenCliente` = true → las líneas nacen `confirmado = false`
     * (las del mozo nacen en true y pasan el gate solas).
     *
     * @param  array<int, array{plato_id: int, cantidad: int, ingredientes?: list<int>, excluir?: list<int>}>  $lineas
     *
     * @throws \Exception
     */
    public function agregarProducto(
        int $mesaId,
        array $lineas,
        ?int $pedidoId = null,
        ?int $pedidoPadreId = null,
        bool $origenCliente = false,
    ): Pedido {
        return DB::transaction(function () use ($mesaId, $lineas, $pedidoId, $pedidoPadreId, $origenCliente) {
            $mesa = $this->mesas->porId($mesaId);

            if (! $mesa) {
                throw new \Exception('La mesa indicada no existe.');
            }

            $pedido = $this->resolverPedidoDestino($mesa, $pedidoId, $pedidoPadreId);

            if (! $pedido) {
                // Pedido nuevo (raíz o hijo): ocupamos la mesa ANTES de
                // crearlo, así ocupada_desde <= fecha y el corte de la
                // cuenta de la visita lo cubre.
                $mesa->ocupar();

                $pedido = $this->pedidos->crear([
                    'mesa_id' => $mesa->id,
                    'pedido_padre_id' => $pedidoPadreId,
                    'estado' => 'en_curso',
                    'total' => 0,
                    'fecha' => now(),
                ]);
            }

            $confirmado = ! $origenCliente;

            foreach ($lineas as $linea) {
                $pedido->total += $this->agregarLinea($pedido, $linea, $confirmado);
            }

            $pedido->save();

            return $this->pedidos->conDetallesOrFail($pedido->id);
        });
    }

    /**
     * ¿A qué pedido van estas líneas? null = hay que crear uno nuevo
     * (raíz, o hijo si viene pedido_padre_id).
     *
     * @throws \Exception
     */
    private function resolverPedidoDestino(Mesa $mesa, ?int $pedidoId, ?int $pedidoPadreId): ?Pedido
    {
        if ($pedidoId !== null && $pedidoPadreId !== null) {
            throw new \Exception('No podes indicar pedido_id y pedido_padre_id a la vez.');
        }

        if ($pedidoId !== null) {
            $pedido = $this->pedidos->porId($pedidoId);

            if (! $pedido || $pedido->mesa_id !== $mesa->id) {
                throw new \Exception('El pedido indicado no pertenece a esta mesa.');
            }

            if ($pedido->estado !== 'en_curso') {
                throw new \Exception('Solo se pueden agregar lineas a un pedido en curso.');
            }

            return $pedido;
        }

        if ($pedidoPadreId !== null) {
            $padre = $this->pedidos->porId($pedidoPadreId);

            if (! $padre || $padre->mesa_id !== $mesa->id) {
                throw new \Exception('El pedido padre no pertenece a esta mesa.');
            }

            if (! $padre->esRaiz()) {
                throw new \Exception('El pedido padre debe ser la primer orden de la persona (raiz del arbol).');
            }

            if ($padre->estado === 'en_curso') {
                throw new \Exception('El pedido padre sigue en curso: agranda ese pedido (pedido_id) en vez de crear otro.');
            }

            if ($padre->estado === 'cancelado') {
                throw new \Exception('El pedido padre fue cancelado: no se le pueden agregar pedidos hijos.');
            }

            return null;
        }

        return null;
    }

    /**
     * Una línea del pedido: valida plato/ingredientes contra
     * PLATO_INGREDIENTE, crea el detalle y sus filas de
     * DETALLE_INGREDIENTE (excluido/agregado).
     *
     * @param  array{plato_id: int, cantidad: int, ingredientes?: list<int>, excluir?: list<int>}  $linea
     */
    private function agregarLinea(Pedido $pedido, array $linea, bool $confirmado): float
    {
        $cantidad = (int) $linea['cantidad'];
        $agregados = array_map('intval', $linea['ingredientes'] ?? []);
        $excluidos = array_map('intval', $linea['excluir'] ?? []);

        if ($cantidad <= 0) {
            throw new \Exception('La cantidad debe ser mayor a 0.');
        }

        if (array_intersect($agregados, $excluidos) !== []) {
            throw new \Exception('Un ingrediente no puede agregarse y excluirse a la vez.');
        }

        // Plato con sus ingredientes y los flags opcional / por_defecto.
        $plato = $this->platos->conIngredientesOrFail((int) $linea['plato_id']);
        $ingredientesPlato = $plato->ingredientes;
        $precioUnitario = (float) $plato->precio;
        // calculo de promociones
        $promo = $this->promociones->promoDePlato($plato);
        $descuento = $promo ? $this->promociones->descuento($promo, (float) $plato->precio, $cantidad) : 0.0;

        // Agregados: solo ingredientes marcados como opcionales,
        // cobran su precio de catálogo por unidad. Los que ya vienen
        // por defecto no se pueden "agregar" de nuevo.
        foreach (array_unique($agregados) as $ingredienteId) {
            $ingrediente = $ingredientesPlato->firstWhere('id', $ingredienteId);

            if (! $ingrediente) {
                throw new \Exception('El ingrediente seleccionado no pertenece al plato.');
            }

            if (! $ingrediente->pivot->opcional) {
                throw new \Exception('El ingrediente seleccionado no es opcional.');
            }

            if ($ingrediente->pivot->por_defecto) {
                throw new \Exception('El ingrediente seleccionado ya viene por defecto en el plato.');
            }

            $precioUnitario += (float) $ingrediente->precioAdicional;
        }

        // Excluidos: solo ingredientes modificables (opcional) que
        // vienen por defecto. Excluir no modifica el precio (decisión
        // del DER).
        foreach (array_unique($excluidos) as $ingredienteId) {
            $ingrediente = $ingredientesPlato->firstWhere('id', $ingredienteId);

            if (! $ingrediente) {
                throw new \Exception('El ingrediente a excluir no pertenece al plato.');
            }

            if (! $ingrediente->pivot->opcional || ! $ingrediente->pivot->por_defecto) {
                throw new \Exception('Solo se pueden excluir ingredientes opcionales que vienen por defecto en el plato.');
            }
        }

        // subtotal = cantidad × (precio_lista + Σ agregados) − descuento.
        // La promo vigente del plato se aplica y congela en la línea
        // (PLAN-promociones.md); no hay columna descuento: se deriva.
        $subtotal = round($precioUnitario * $cantidad - $descuento, 2);

        $detalle = $this->detalles->crearLinea($pedido, [
            'plato_id' => $plato->id,
            'cantidad' => $cantidad,
            'precio_lista' => $plato->precio,
            'subtotal' => $subtotal,
            'promocion_id' => $promo?->id,
            'confirmado' => $confirmado,

        ]);

        foreach (array_unique($agregados) as $ingredienteId) {
            $ingrediente = $ingredientesPlato->firstWhere('id', $ingredienteId);

            $this->detalles->crearPersonalizacion($detalle, [
                'ingrediente_id' => $ingredienteId,
                'tipo' => 'agregado',
                'precio_adicional' => $ingrediente->precioAdicional,
            ]);
        }

        foreach (array_unique($excluidos) as $ingredienteId) {
            $this->detalles->crearPersonalizacion($detalle, [
                'ingrediente_id' => $ingredienteId,
                'tipo' => 'excluido',
                'precio_adicional' => null,
            ]);
        }

        return $subtotal;
    }

    // ==================== GATE DE CONFIRMACIÓN (AUTO-PEDIDO) ====================

    /**
     * Confirma (o desconfirma) líneas del pedido. `detalleIds = null` →
     * todas las líneas del pedido. `mesaId` opcional: si viene, el
     * pedido tiene que ser de esa mesa (la usa el cliente para no tocar
     * pedidos ajenos).
     *
     * AUTO-ENVÍO EN LOTE: al confirmar, si TODOS los pedidos vivos de
     * la mesa tienen todas sus líneas confirmadas, salen juntos a
     * cocina (`en_curso → enviado`). Si queda un pedido sin confirmar,
     * ninguno sale (fallback del mozo: confirmarResumen + enviar).
     * Desconfirmar nunca dispara el envío.
     *
     * @param  list<int>|null  $detalleIds
     *
     * @throws \Exception
     */
    public function confirmarLineas(
        int $pedidoId,
        ?array $detalleIds = null,
        bool $confirmado = true,
        ?int $mesaId = null,
    ): Pedido {
        return DB::transaction(function () use ($pedidoId, $detalleIds, $confirmado, $mesaId) {
            $pedido = $this->pedidos->conDetallesOrFail($pedidoId);

            if ($mesaId !== null && $pedido->mesa_id !== $mesaId) {
                throw new \Exception('El pedido no pertenece a esta mesa.');
            }

            if ($pedido->estado !== 'en_curso') {
                throw new \Exception('Solo se pueden confirmar lineas de un pedido en curso.');
            }

            $actualizadas = $this->detalles->marcarConfirmadas($pedidoId, $detalleIds, $confirmado);

            if ($actualizadas === 0) {
                throw new \Exception('No tenes lineas en este pedido para confirmar.');
            }

            if ($confirmado) {
                $this->autoEnviarListosDeMesa($pedido->mesa_id);
            }

            return $this->pedidos->conDetallesOrFail($pedidoId);
        });
    }

    /**
     * Auto-envío en lote (gate por MESA): envía (`en_curso → enviado`)
     * todos los pedidos vivos de la mesa que tengan todas sus líneas
     * confirmadas y al menos una línea. Si un pedido vivo de la mesa
     * quedó con líneas sin confirmar, no se envía NINGUNO (la mesa
     * espera a que el último comensal confirme; el mozo puede forzar).
     *
     * @return Collection<int, Pedido> los pedidos recién enviados
     */
    private function autoEnviarListosDeMesa(int $mesaId): Collection
    {
        // Solo los que siguen esperando (en_curso). Un pedido que el
        // mozo ya dejó en 'confirmado' (su gate manual) no se toca.
        $enCurso = $this->pedidos->activosDeMesa($mesaId)
            ->filter(fn (Pedido $pedido) => $pedido->estado === 'en_curso');

        $listos = $enCurso->filter(fn (Pedido $pedido) => $pedido->detalles->isNotEmpty()
            && $this->todasLasLineasConfirmadas($pedido));

        // Si algún pedido de la mesa quedó sin confirmar, la mesa
        // entera espera (el mozo puede forzar).
        if ($listos->count() !== $enCurso->count()) {
            return collect();
        }

        foreach ($listos as $pedido) {
            $pedido->estado = 'enviado';
            $pedido->save();
        }

        return $listos;
    }

    /**
     * Desconfirmar líneas (deshacer antes del envío).
     *
     * @param  list<int>|null  $detalleIds
     *
     * @throws \Exception
     */
    public function desconfirmarLineas(int $pedidoId, ?array $detalleIds = null, ?int $mesaId = null): Pedido
    {
        return $this->confirmarLineas($pedidoId, $detalleIds, false, $mesaId);
    }

    /**
     * ¿TODAS las líneas del pedido están en confirmado = true?
     * (gate de envío; true también cuando no hay líneas.)
     */
    public function todasLasLineasConfirmadas(Pedido $pedido): bool
    {
        return $this->detalles->sinConfirmar($pedido->id) === 0;
    }

    // ==================== FLUJO DE ESTADOS ====================

    /**
     * Gate de envío (1er paso del mozo): pasa si ninguna línea del
     * pedido sigue sin confirmar, o si `forzar` es true. Válido solo
     * desde `en_curso`; deja el pedido en `confirmado`.
     *
     * @throws \Exception
     */
    public function confirmarResumen(int $pedidoId, bool $forzar = false): Pedido
    {
        return DB::transaction(function () use ($pedidoId, $forzar) {
            $pedido = $this->pedidos->conDetallesOrFail($pedidoId);

            if ($pedido->estado !== 'en_curso') {
                throw new \Exception('Solo se puede confirmar un pedido en curso.');
            }

            if ($pedido->detalles->isEmpty()) {
                throw new \Exception('No se puede confirmar un pedido vacio.');
            }

            if (! $forzar && ! $this->todasLasLineasConfirmadas($pedido)) {
                throw new \Exception('Faltan comensales por confirmar sus lineas (usa forzar para enviar igual).');
            }

            $pedido->estado = 'confirmado';
            $pedido->save();

            return $this->pedidos->conDetallesOrFail($pedido->id);
        });
    }

    /**
     * Pasa el pedido "confirmado" a "enviado" (hacia cocina). Es el
     * 2do paso del mozo: exige haber pasado por confirmarResumen.
     *
     * @throws \Exception
     */
    public function enviarPedido(int $pedidoId): Pedido
    {
        return DB::transaction(function () use ($pedidoId) {
            $pedido = $this->pedidos->conDetallesOrFail($pedidoId);

            if ($pedido->estado !== 'confirmado') {
                throw new \Exception('Solo se puede enviar un pedido confirmado.');
            }

            if ($pedido->detalles->isEmpty()) {
                throw new \Exception('No se puede enviar un pedido vacio.');
            }

            $pedido->estado = 'enviado';
            $pedido->save();

            return $this->pedidos->conDetallesOrFail($pedidoId);
        });
    }

    /**
     * Avanza el pedido en el tramo del MOZO:
     *   listo → entregado → cerrado
     * y permite cancelar desde cualquier estado no final (el cancel
     * es exclusivo del mozo). También permite deshacer
     * confirmado → en_curso (reabrir resumen). La preparación la
     * avanza la cocina (`avanzarEnCocina`). NO toca la mesa: la
     * visita sigue hasta que el mozo la cierra tras el pago
     * (POST /mesas/{mesa}/cerrar).
     *
     * @throws \Exception
     */
    public function cambiarEstado(int $pedidoId, string $nuevoEstado): Pedido
    {
        $transiciones = [
            'en_curso' => ['cancelado'],
            'confirmado' => ['en_curso', 'cancelado'],
            'enviado' => ['cancelado'],
            'en_preparacion' => ['cancelado'],
            'listo' => ['entregado', 'cancelado'],
            'entregado' => ['cerrado', 'cancelado'],
        ];

        return $this->aplicarTransicion($pedidoId, $nuevoEstado, $transiciones);
    }

    /**
     * Avance de COCINA (PUT /api/cocina/pedidos/{id}/estado,
     * permiso preparar_pedidos): SOLO cambia el estado, sin otros
     * efectos. Tramo exclusivo de la cocina y sin saltos:
     *   enviado → en_preparacion → listo
     * Ni cancel ni el resto de los estados: los maneja el mozo con
     * `cambiarEstado`.
     *
     * @throws \Exception
     */
    public function avanzarEnCocina(int $pedidoId, string $nuevoEstado): Pedido
    {
        $transiciones = [
            'enviado' => ['en_preparacion'],
            'en_preparacion' => ['listo'],
        ];

        return $this->aplicarTransicion($pedidoId, $nuevoEstado, $transiciones);
    }

    /**
     * Aplica una transición de estado en una transacción de DB:
     * valida contra el mapa, persiste y devuelve el pedido con sus
     * detalles recargados.
     *
     * @param  array<string, list<string>>  $transiciones
     *
     * @throws \Exception si el salto no está permitido
     */
    private function aplicarTransicion(int $pedidoId, string $nuevoEstado, array $transiciones): Pedido
    {
        return DB::transaction(function () use ($pedidoId, $nuevoEstado, $transiciones) {
            $pedido = $this->pedidos->conDetallesOrFail($pedidoId);

            $permitidos = $transiciones[$pedido->estado] ?? [];

            if (! in_array($nuevoEstado, $permitidos, true)) {
                throw new \Exception(
                    "No se puede pasar de '{$pedido->estado}' a '{$nuevoEstado}'."
                );
            }

            $pedido->estado = $nuevoEstado;
            $pedido->save();

            return $this->pedidos->conDetallesOrFail($pedidoId);
        });
    }

    // ==================== CONSULTAS ====================

    /**
     * Pedidos no finalizados de una mesa (los que admite trabajar el
     * mozo), con sus líneas.
     *
     * @return Collection<int, Pedido>
     */
    public function pedidosActivosDeMesa(int $mesaId)
    {
        return $this->pedidos->activosDeMesa($mesaId);
    }
}
