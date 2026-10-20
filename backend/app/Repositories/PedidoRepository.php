<?php

namespace App\Repositories;

use App\Models\Pedido;
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
     * ¿Queda algún pedido no finalizado en la mesa? (al finalizar el
     * último se destruye la mesa).
     */
    public function hayActivosDeMesa(int $mesaId): bool;

    /**
     * Pedidos de la visita de una mesa: excluye 'cancelado' y corta
     * por `ocupada_desde` (histórico para la cuenta dividida).
     *
     * @return Collection<int, Pedido>
     */
    public function pedidosDeVisita(int $mesaId, ?string $desde): Collection;

    public function ventasEntre(string $desde, string $hasta): array;

    public function porEstadoEntre(string $desde, string $hasta): array;

    public function platosMasVendidos(string $desde, string $hasta, int $limite = 10): Collection;

    public function conDetallesYTrashedOrFail(int $id): Pedido;
}
