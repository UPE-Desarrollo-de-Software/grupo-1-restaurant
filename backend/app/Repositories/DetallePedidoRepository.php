<?php

namespace App\Repositories;

use App\Models\DetallePedido;
use App\Models\Pedido;

/**
 * Puerto de persistencia de DETALLE_PEDIDO (capa Repository): las
 * líneas del pedido, su gate `confirmado` y sus personalizaciones
 * (DETALLE_INGREDIENTE).
 */
interface DetallePedidoRepository
{
    /**
     * Crea la línea dentro del pedido.
     *
     * @param  array<string, mixed>  $datos
     */
    public function crearLinea(Pedido $pedido, array $datos): DetallePedido;

    /**
     * Registra una personalización de la línea (agregado/excluido).
     *
     * @param  array<string, mixed>  $datos
     */
    public function crearPersonalizacion(DetallePedido $detalle, array $datos): void;

    /**
     * Marca (o desmarca) `confirmado` en las líneas del pedido. Con
     * $detalleIds null aplica a todas; devuelve cuántas filas tocó (0 =
     * el caller debe rechazar: no había líneas que marcar).
     *
     * @param  list<int>|null  $detalleIds
     */
    public function marcarConfirmadas(int $pedidoId, ?array $detalleIds, bool $confirmado): int;

    /**
     * ¿Cuántas líneas del pedido siguen sin confirmar? (gate de envío:
     * tiene que ser 0, o el mozo fuerza).
     */
    public function sinConfirmar(int $pedidoId): int;
}
