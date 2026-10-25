<?php

namespace App\Repositories;

use App\Models\Pedido;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

/**
 * Puerto de persistencia de PEDIDOS (capa Repository).
 *
 * La "relación unitaria" PEDIDO→PEDIDO y la regla de estados finales
 * se consultan acá; la lógica (árboles, gates, transiciones) vive en
 * PedidoService.
 */
interface PedidoRepository
{
    /**
     * Pedido por id con plato/personalizaciones de sus líneas;
     * lanza ModelNotFoundException (404) si no existe.
     */
    public function conDetallesOrFail(int $id): Pedido;

    /**
     * Pedido por id a secas (validaciones de destino/agrupación);
     * null si no existe.
     */
    public function porId(int $id): ?Pedido;

    /**
     * @param  array<string, mixed>  $datos
     */
    public function crear(array $datos): Pedido;

    /**
     * Pedidos NO finalizados de una mesa (los que admite enviar),
     * con sus líneas cargadas.
     *
     * @return Collection<int, Pedido>
     */
    public function activosDeMesa(int $mesaId): Collection;

    /**
     * ¿Queda algún pedido no finalizado en la mesa? (gate para cerrar
     * la visita: la cierra el mozo tras el PAGO, no un pedido).
     */
    public function hayActivosDeMesa(int $mesaId): bool;

    /**
     * Cola de cocina: pedidos en 'enviado' (por preparar) y
     * 'en_preparacion' (en cocción), con sus líneas y su mesa, en
     * orden de llegada.
     *
     * @return Collection<int, Pedido>
     */
    public function pendientesDeCocina(): Collection;

    /**
     * Pedidos de la visita de una mesa: excluye 'cancelado' y corta
     * por `ocupada_desde` (histórico para la cuenta dividida).
     *
     * @return Collection<int, Pedido>
     */
    public function pedidosDeVisita(int $mesaId, ?string $desde): Collection;

    /**
     * Ventas de un período (dashboard): cantidad y suma de `total`
     * de los pedidos en los estados indicados (ESTADOS_VENTA).
     *
     * @param  list<string>  $estados
     * @return array{cantidad: int, total: float}
     */
    public function ventasEntre(string $desde, string $hasta, array $estados): array;

    /**
     * Conteo de pedidos por estado en un período (solo los estados
     * presentes; el service rellena los faltantes con 0).
     *
     * @return array<string, int>
     */
    public function porEstadoEntre(string $desde, string $hasta): array;

    /**
     * Top de platos más vendidos en un período, por unidades desc.
     *
     * @param  list<string>  $estados
     * @return Collection<int, object{plato_id: int, nombre: string, unidades: int, total: float}>
     */
    public function platosMasVendidos(string $desde, string $hasta, array $estados, int $limite = 10): Collection;

    /**
     * HISTORIAL DE COMANDAS: pedidos paginados con su mesa (incluso
     * destruida) y sus líneas. Sin filtro de estado se limita a los
     * finalizados (cerrado/cancelado).
     *
     * @return LengthAwarePaginator<int, Pedido>
     */
    public function historialPaginado(?string $desde, ?string $hasta, ?string $estado, ?int $mesaId, int $pagina, int $porPagina): LengthAwarePaginator;

    /**
     * Comanda por id para el historial: con líneas y mesa (la mesa
     * puede haber sido destruida → withTrashed). Lanza
     * ModelNotFoundException (404) si no existe.
     */
    public function conDetallesYTrashedOrFail(int $id): Pedido;
}
