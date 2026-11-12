<?php

namespace App\Services;

use App\Models\DetallePreOrden;
use App\Models\Pedido;
use App\Models\Reserva;
use App\Repositories\PlatoRepository;
use App\Repositories\PreordenRepository;
use App\Repositories\ReservaRepository;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * PRE-ORDEN — servicio de dominio (arquitectura hexagonal: capa
 * Service sobre los Repositories Preorden/Reserva/Plato).
 *
 * Reglas (PLAN-preorden-reserva.md):
 *  - una pre-orden por reserva: guardar/actualizar hace MERGE por
 *    `plato_id` (la cantidad se reemplaza, no se acumula) y solo
 *    mientras la reserva siga `pendiente` (422 después);
 *  - los platos tienen que existir y estar activos; las cantidades,
 *    > 0. Los precios NO se guardan: se calculan al convertir;
 *  - "quien llega último convierte": `convertirPreOrdenEnPedido()` se
 *    llama desde `finalizar()` (si ya hay mesa vinculada) y desde
 *    `MesaService::crearMesa()` (si la reserva ya estaba finalizada).
 *    Es idempotente: sin mesa o sin líneas pendientes → no-op (null);
 *  - la conversión reutiliza el flujo normal de pedidos:
 *    `PedidoService::agregarProducto()` → `confirmarResumen()` →
 *    `enviarPedido()` (el pedido nace y sale a cocina solo, en estado
 *    `enviado`) y recién ahí se estampa `pedido_id` en las líneas;
 *  - reserva `cancelada` / `no_asistio` → NO convierte (422 si se
 *    pide a mano; las líneas quedan como histórico).
 */
class PreordenService
{
    public function __construct(
        private PreordenRepository $preordenes,
        private ReservaRepository $reservas,
        private PlatoRepository $platos,
        private PedidoService $pedidos,
    ) {}

    // ==================== CONSULTA ====================

    /**
     * Pre-orden de una reserva por id; lanza ModelNotFoundException
     * (404) si la reserva no existe.
     *
     * @return Collection<int, DetallePreOrden>
     */
    public function obtenerPorReserva(int $reservaId): Collection
    {
        return $this->preordenes->deReserva($this->reservas->porIdOrFail($reservaId)->id);
    }

    /**
     * Pre-orden de una reserva por su PIN de 4 dígitos (edición
     * pública del cliente); lanza ModelNotFoundException si no hay
     * ninguna reserva con ese PIN.
     *
     * @return Collection<int, DetallePreOrden>
     */
    public function obtenerPorCodigo(string $codigo): Collection
    {
        return $this->preordenes->deReserva($this->reservaPorCodigo($codigo)->id);
    }

    // ==================== ESCRITURA ====================

    /**
     * Guarda/actualiza las líneas de la pre-orden de la reserva
     * (merge por `plato_id`). Exige reserva `pendiente`, platos
     * existentes y activos y cantidades > 0.
     *
     * @param  array<int, array{plato_id: int|string, cantidad: int|string}>  $lineas
     * @return Collection<int, DetallePreOrden>
     *
     * @throws \Exception reserva no pendiente, plato inexistente o inactivo
     */
    public function guardar(Reserva $reserva, array $lineas): Collection
    {
        if ($reserva->estado !== 'pendiente') {
            throw new \Exception('La reserva no está pendiente: la pre-orden solo se edita mientras espere al cliente.');
        }

        $normalizadas = [];

        foreach ($lineas as $linea) {
            $platoId = (int) ($linea['plato_id'] ?? 0);
            $cantidad = (int) ($linea['cantidad'] ?? 0);

            $plato = $this->platos->conIngredientesOrFail($platoId);

            if (! $plato->disponible) {
                throw new \Exception("El plato {$plato->nombre} no está disponible para la pre-orden.");
            }

            if ($cantidad < 1) {
                throw new \Exception('La cantidad de cada línea de la pre-orden debe ser mayor a 0.');
            }

            $normalizadas[] = ['plato_id' => $platoId, 'cantidad' => $cantidad];
        }

        if ($normalizadas === []) {
            return $this->preordenes->deReserva($reserva->id);
        }

        return $this->preordenes->guardar($reserva, $normalizadas);
    }

    /**
     * Actualiza la pre-orden de una reserva por id (empleado).
     *
     * @param  array<int, array{plato_id: int|string, cantidad: int|string}>  $lineas
     * @return Collection<int, DetallePreOrden>
     */
    public function actualizarPorReserva(int $reservaId, array $lineas): Collection
    {
        return $this->guardar($this->reservas->porIdOrFail($reservaId), $lineas);
    }

    /**
     * Actualiza la pre-orden de una reserva por su PIN (cliente web).
     *
     * @param  array<int, array{plato_id: int|string, cantidad: int|string}>  $lineas
     * @return Collection<int, DetallePreOrden>
     */
    public function actualizarPorCodigo(string $codigo, array $lineas): Collection
    {
        return $this->guardar($this->reservaPorCodigo($codigo), $lineas);
    }

    /**
     * Vacia la pre-orden de una reserva por id (carrito vacío).
     */
    public function eliminarPorReserva(int $reservaId): void
    {
        $reserva = $this->reservas->porIdOrFail($reservaId);

        if ($reserva->estado !== 'pendiente') {
            throw new \Exception('La reserva no está pendiente: la pre-orden solo se edita mientras espere al cliente.');
        }

        $this->preordenes->borrarDeReserva($reserva->id);
    }

    /**
     * Vacia la pre-orden de una reserva por su PIN (cliente web).
     */
    public function eliminarPorCodigo(string $codigo): void
    {
        $reserva = $this->reservaPorCodigo($codigo);

        if ($reserva->estado !== 'pendiente') {
            throw new \Exception('La reserva no está pendiente: la pre-orden solo se edita mientras espere al cliente.');
        }

        $this->preordenes->borrarDeReserva($reserva->id);
    }

    // ==================== CONVERSIÓN ====================

    /**
     * Convierte la pre-orden PENDIENTE de la reserva en un pedido real
     * en la mesa indicada (o en la mesa principal de la reserva):
     * `agregarProducto()` (origen de mozo: las líneas nacen
     * confirmadas) → `confirmarResumen()` → `enviarPedido()` y, recién
     * ahí, se estampa `pedido_id` en las líneas.
     *
     * Idempotente: devuelve null (sin efecto) si todavía no hay mesa,
     * si la reserva no tenía pre-orden o si ya se convirtió. Lanza
     * \Exception (422) si la reserva está `cancelada` o `no_asistio`.
     *
     * @throws \Exception reserva en estado que no convierte
     */
    public function convertirPreOrdenEnPedido(int $reservaId, ?int $mesaId = null): ?Pedido
    {
        $reserva = $this->reservas->porIdOrFail($reservaId);

        if ($reserva->estado !== 'pendiente' && $reserva->estado !== 'finalizada') {
            throw new \Exception(
                "La reserva {$reserva->id} está {$reserva->estado}: la pre-orden no se convierte en pedido."
            );
        }

        // Sin mesa vinculada no hay dónde poner el pedido: la convertirá
        // quien llegue último (crear la mesa con `reserva_id`).
        $mesaId ??= $reserva->mesa_id;

        if ($mesaId === null) {
            return null;
        }

        $lineas = $this->preordenes->pendientesDeReserva($reserva->id);

        if ($lineas->isEmpty()) {
            // Ya se convirtió (o la reserva no tenía pre-orden).
            return null;
        }

        return DB::transaction(function () use ($lineas, $mesaId, $reserva) {
            $pedido = $this->pedidos->agregarProducto(
                mesaId: (int) $mesaId,
                lineas: $lineas->map(fn (DetallePreOrden $linea): array => [
                    'plato_id' => (int) $linea->plato_id,
                    'cantidad' => (int) $linea->cantidad,
                ])->all(),
                origenCliente: false,
            );

            $pedido = $this->pedidos->confirmarResumen($pedido->id);
            $pedido = $this->pedidos->enviarPedido($pedido->id);

            $this->preordenes->marcarConvertida($reserva->id, $pedido->id);

            return $pedido;
        });
    }

    // ==================== INTERNAS ====================

    /**
     * Reserva por su PIN de 4 dígitos; lanza ModelNotFoundException
     * si no hay ninguna (el controller responde igual que /acceso).
     */
    private function reservaPorCodigo(string $codigo): Reserva
    {
        $reserva = $this->reservas->porCodigo($codigo);

        if (! $reserva) {
            throw new ModelNotFoundException('No hay ninguna reserva con ese PIN.');
        }

        return $reserva;
    }
}
