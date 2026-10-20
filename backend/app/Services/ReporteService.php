<?php

namespace App\Services;

use App\Models\DetallePedido;
use App\Models\Pedido;
use App\Repositories\ConfigMesaRepository;
use App\Repositories\MesaRepository;
use App\Repositories\PedidoRepository;
use App\Repositories\ReservaRepository;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

/**
 * REPORTES — servicio de dominio del módulo Reportes: dashboard de
 * estadísticas e historial de comandas (= pedidos, con sus líneas y
 * su mesa aunque haya sido destruida).
 *
 * Las consultas agregadas viven en los repositories; acá se arma la
 * forma de la respuesta y se aplican las reglas de qué cuenta como
 * "venta" (ESTADOS_VENTA) y qué estados se muestran siempre.
 */
class ReporteService
{
    /**
     * Estados que cuentan como VENTA: el consumo está servido y la
     * cuenta cerrada. Los activos y los cancelados quedan fuera.
     *
     * @var list<string>
     */
    private const ESTADOS_VENTA = ['entregado', 'cerrado'];

    /**
     * Los 7 estados del DER, en flujo.
     *
     * @var list<string>
     */
    private const ESTADOS_TODOS = [
        'en_curso',
        'confirmado',
        'enviado',
        'en_preparacion',
        'entregado',
        'cerrado',
        'cancelado',
    ];

    public function __construct(
        private PedidoRepository $pedidos,
        private ReservaRepository $reservas,
        private MesaRepository $mesas,
        private ConfigMesaRepository $configMesas,
    ) {}

    // ==================== DASHBOARD ====================

    /**
     * @return array<string, mixed>
     */
    public function dashboard(string $desde, string $hasta): array
    {
        $ventas = $this->pedidos->ventasEntre($desde, $hasta, self::ESTADOS_VENTA);

        return [
            'periodo' => ['desde' => $desde, 'hasta' => $hasta],
            'ventas' => [
                'cantidad_pedidos' => $ventas['cantidad'],
                'total' => round($ventas['total'], 2),
                'ticket_promedio' => $ventas['cantidad'] > 0
                    ? round($ventas['total'] / $ventas['cantidad'], 2)
                    : 0.0,
            ],
            'pedidos_por_estado' => $this->pedidosPorEstado($desde, $hasta),
            'platos_mas_vendidos' => $this->pedidos->platosMasVendidos($desde, $hasta, self::ESTADOS_VENTA)
                ->map(fn ($fila) => [
                    'plato_id' => (int) $fila->plato_id,
                    'nombre' => (string) $fila->nombre,
                    'unidades' => (int) $fila->unidades,
                    'total' => round((float) $fila->total, 2),
                ])
                ->values()
                ->all(),
            'ocupacion_actual' => $this->ocupacionActual(),
            'reservas_hoy' => $this->resumenReservasDeHoy(),
        ];
    }

    /**
     * Conteo por estado en el período, con los 7 estados siempre
     * presentes (0 los vacíos).
     *
     * @return array<string, int>
     */
    private function pedidosPorEstado(string $desde, string $hasta): array
    {
        $conteos = $this->pedidos->porEstadoEntre($desde, $hasta);

        $salida = [];
        foreach (self::ESTADOS_TODOS as $estado) {
            $salida[$estado] = $conteos[$estado] ?? 0;
        }

        return $salida;
    }

    /**
     * Ocupación "ahora" (no depende del período): mesas vivas por
     * estado + cubiertos ocupados contra el aforo de CONFIG_MESA.
     *
     * @return array<string, mixed>
     */
    private function ocupacionActual(): array
    {
        $conteos = $this->mesas->cantidadPorEstado();

        $libres = $conteos['libre'] ?? 0;
        $ocupadas = $conteos['ocupada'] ?? 0;
        $reservadas = $conteos['reservada'] ?? 0;

        $cubiertos = $this->mesas->capacidadOcupada();
        $aforo = $this->configMesas->aforo();

        return [
            'mesas' => [
                'libres' => $libres,
                'ocupadas' => $ocupadas,
                'reservadas' => $reservadas,
                'total' => $libres + $ocupadas + $reservadas,
            ],
            'cubiertos_ocupados' => $cubiertos,
            'aforo' => $aforo,
            'porcentaje_aforo' => $aforo > 0
                ? round($cubiertos * 100 / $aforo, 1)
                : 0.0,
        ];
    }

    /**
     * Reservas de HOY (siempre la fecha actual, no el período del
     * dashboard): conteo por estado + personas de las pendientes. El
     * estado singular del DER se expone en plural (pendientes,
     * canceladas, finalizadas); `no_asistio` no tiene plural.
     *
     * @return array<string, mixed>
     */
    private function resumenReservasDeHoy(): array
    {
        $hoy = now()->toDateString();
        $resumen = $this->reservas->resumenDelDia($hoy);

        return [
            'fecha' => $hoy,
            'pendientes' => $resumen['por_estado']['pendiente'] ?? 0,
            'canceladas' => $resumen['por_estado']['cancelada'] ?? 0,
            'finalizadas' => $resumen['por_estado']['finalizada'] ?? 0,
            'no_asistio' => $resumen['por_estado']['no_asistio'] ?? 0,
            'total_personas_pendientes' => $resumen['total_personas_pendientes'],
        ];
    }

    // ==================== HISTORIAL DE COMANDAS ====================

    /**
     * Listado paginado de comandas (= pedidos) con sus líneas y su
     * mesa (aunque haya sido destruida).
     *
     * @param  array{desde?: string|null, hasta?: string|null, estado?: string|null, mesa_id?: int|null, per_page?: int}  $filtros
     * @return LengthAwarePaginator<int, array<string, mixed>>
     */
    public function historial(array $filtros): LengthAwarePaginator
    {
        $paginator = $this->pedidos->historialPaginado(
            $filtros['desde'] ?? null,
            $filtros['hasta'] ?? null,
            $filtros['estado'] ?? null,
            isset($filtros['mesa_id']) ? (int) $filtros['mesa_id'] : null,
            (int) ($filtros['page'] ?? 1),
            (int) ($filtros['per_page'] ?? 20),
        );

        $paginator->setCollection(
            $paginator->getCollection()->map(fn (Pedido $pedido) => $this->comandaAArray($pedido))
        );

        return $paginator;
    }

    /**
     * Comanda única por id (extravíos). Lanza
     * ModelNotFoundException si no existe (controller → 404).
     *
     * @return array<string, mixed>
     */
    public function comanda(int $id): array
    {
        return $this->comandaAArray($this->pedidos->conDetallesYTrashedOrFail($id));
    }

    /**
     * Vista de una comanda para el historial: cabecera + mesa (con
     * flag `destruida`) + sus líneas.
     *
     * @return array<string, mixed>
     */
    private function comandaAArray(Pedido $pedido): array
    {
        $mesa = $pedido->mesaHistorial;

        return [
            'id' => $pedido->id,
            'pedido_padre_id' => $pedido->pedido_padre_id,
            'estado' => $pedido->estado,
            'total' => (float) $pedido->total,
            'fecha' => (string) $pedido->fecha,
            'mesa' => $mesa ? [
                'id' => $mesa->id,
                'codigo_acceso' => $mesa->codigo_acceso,
                'capacidad' => (int) $mesa->capacidad,
                'destruida' => $mesa->trashed(),
            ] : null,
            'lineas' => $pedido->detalles
                ->map(fn (DetallePedido $detalle) => [
                    'detalle_id' => $detalle->id,
                    'plato_id' => $detalle->plato_id,
                    'plato' => $detalle->plato?->nombre,
                    'cantidad' => (int) $detalle->cantidad,
                    'precio_lista' => (float) $detalle->precio_lista,
                    'subtotal' => (float) $detalle->subtotal,
                    'promocion' => $detalle->promocion
                        ? [
                            'id' => $detalle->promocion->id,
                            'nombre' => $detalle->promocion->nombre,
                            'tipo' => $detalle->promocion->tipo,
                        ]
                        : null,
                    'confirmado' => (bool) $detalle->confirmado,
                ])
                ->values()
                ->all(),
        ];
    }
}
