<?php

namespace App\Services;

use App\Exceptions\ApiException;
use App\Models\DetallePedido;
use App\Models\Mesa;
use App\Models\Pedido;
use App\Repositories\ConfigMesaRepository;
use App\Repositories\DetallePedidoRepository;
use App\Repositories\MesaRepository;
use App\Repositories\PedidoRepository;
use App\Repositories\ReservaRepository;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * MESA — servicio de dominio (arquitectura hexagonal: capa Service
 * sobre los Repositories Mesa/Pedido/ConfigMesa).
 *
 * Reglas del rebote 2 (DER v2.2):
 *  - entidad DINÁMICA: la crea el mozo o el sistema al reservar por
 *    la web ("mozo virtual") y se DESTRUYE
 *    (borrado lógico) al terminar el servicio; `codigo_acceso` nace
 *    con la mesa y no cambia nunca;
 *  - AFORO: al crear, Σ capacidad(mesas vivas) + capacidad nueva ≤
 *    aforo (Σ capacidad×cantidad de CONFIG_MESA); además el total de
 *    mesas vivas + 1 no puede superar Σ cantidad;
 *  - la cuenta ya no divide por "comensal con fila en el pivot": son
 *    PARTES por pedido RAÍZ (raíz + sus hijos = lo que paga cada quien);
 *  - `ocupada_desde` sigue siendo el corte de la visita.
 */
class MesaService
{
    public function __construct(
        private MesaRepository $mesas,
        private PedidoRepository $pedidos,
        private DetallePedidoRepository $detalles,
        private ConfigMesaRepository $configMesas,
        private ReservaRepository $reservas,
    ) {}

    // ==================== CRUD Y CICLO DE VIDA ====================

    public function obtenerDisponibles(): Collection
    {
        // Estado 'libre' = sin pedido activo ni reserva (DER).
        return $this->mesas->disponibles();
    }

    public function obtenerMesas(): Collection
    {
        return $this->mesas->todas();
    }

    /**
     * Mesa viva por id; lanza ModelNotFoundException (404) si no existe
     * (o fue destruida).
     */
    public function obtenerPorId(int $id): Mesa
    {
        return $this->mesas->porIdOrFail($id);
    }

    /**
     * Alta de mesa dinámica: valida el AFORO del lugar y genera el
     * único código de acceso de la mesa (4 dígitos) ANTES de crearla.
     *
     * @param  array<string, mixed>  $datos  {capacidad, estado?, usuario_id?}
     *
     * @throws \Exception aforo o tope de mesas superado
     */
    public function crearMesa(array $datos): Mesa
    {
        $capacidad = (int) ($datos['capacidad'] ?? 0);

        $aforo = $this->configMesas->aforo();
        $ocupada = $this->mesas->capacidadOcupada();

        if ($ocupada + $capacidad > $aforo) {
            throw new \Exception(
                "Se supera la capacidad del lugar: aforo {$aforo}, ocupada {$ocupada}, "
                    ."la mesa nueva necesita {$capacidad}."
            );
        }

        $maxMesas = $this->configMesas->cantidadMaximaMesas();
        $vivas = $this->mesas->todas()->count();

        if ($vivas + 1 > $maxMesas) {
            throw new \Exception(
                "Se supera la cantidad de mesas permitidas: máximo {$maxMesas}, vivas {$vivas}."
            );
        }

        // El código lo genera SIEMPRE el service: es la credencial del
        // cliente y debe ser único (no viene del request).
        $datos['codigo_acceso'] = $this->mesas->nuevoCodigoAcceso();
        $datos['estado'] = $datos['estado'] ?? 'libre';

        return $this->mesas->crear($datos);
    }

    /**
     * Edita capacidad/estado/responsable. `codigo_acceso` no es
     * editable (nace con la mesa y vive hasta que se destruya) y si
     * cambia la capacidad se vuelve a validar el AFORO.
     *
     * @param  array<string, mixed>  $datos
     *
     * @throws \Exception aforo superado
     */
    public function actualizar(int $id, array $datos): Mesa
    {
        $mesa = $this->mesas->porIdOrFail($id);

        // `codigo_acceso` no es editable: nace con la mesa y vive
        // hasta que se destruya (si no, los comensales quedan afuera).
        unset($datos['codigo_acceso']);

        if (isset($datos['capacidad']) && (int) $datos['capacidad'] !== (int) $mesa->capacidad) {
            $capacidadNueva = (int) $datos['capacidad'];
            $ocupadaFutura = $this->mesas->capacidadOcupada() - (int) $mesa->capacidad + $capacidadNueva;
            $aforo = $this->configMesas->aforo();

            if ($ocupadaFutura > $aforo) {
                throw new \Exception(
                    "Se supera la capacidad del lugar: aforo {$aforo}, ocupada {$ocupadaFutura} con la mesa editada."
                );
            }
        }

        $mesa->update($datos);

        return $mesa;
    }

    /**
     * Destrucción de la mesa (borrado lógico). Antes cancela sus
     * reservas PENDIENTES (la mesa deja de existir para el DER v3.0).
     *
     * @return int cantidad de reservas canceladas
     */
    public function eliminar(int $id): int
    {
        $mesa = $this->mesas->porIdOrFail($id);

        $canceladas = 0;
        foreach ($this->reservas->pendientesDeMesa($id) as $reserva) {
            $reserva->estado = 'cancelada';
            $reserva->save();
            $canceladas++;
        }

        $this->mesas->eliminar($mesa);

        return $canceladas;
    }

    // ==================== SERVICIO DE LA VISITA ====================

    /**
     * Acceso del comensal: resuelve la mesa por su código de acceso
     * (POST /api/acceso y el middleware `cliente`). Solo las mesas
     * vivas: el código de una mesa destruida deja de valer.
     *
     * @throws ApiException 401 si el código no corresponde a ninguna mesa
     */
    public function accederConCodigo(string $codigo): Mesa
    {
        $mesa = $this->mesas->porCodigo($codigo);

        if (! $mesa) {
            throw new ApiException(401, 'Codigo de mesa invalido o expirado.');
        }

        return $mesa;
    }

    /**
     * Marca la mesa como ocupada (paso manual del mozo antes de que
     * haya pedidos). NO regenera el código: el código es estable desde
     * el alta hasta la destrucción.
     *
     * `ocupada_desde` es el corte de la visita: se pone solo al pasar
     * de libre → ocupada.
     *
     * @return array{mesa: Mesa, codigo_acceso: string}
     */
    public function ocupar(int $mesaId): array
    {
        $mesa = $this->mesas->porId($mesaId);

        if (! $mesa) {
            throw new \Exception('La mesa indicada no existe.');
        }

        $mesa->ocupar();

        return ['mesa' => $mesa, 'codigo_acceso' => $mesa->codigo_acceso];
    }

    /**
     * Agrupa varias mesas para el resumen conjunto de LECTURA (los
     * pedidos siguen siendo por mesa; no se fusiona nada). Los códigos
     * NO cambian: los comensales siguen entrando con el mismo.
     *
     * @param  list<int>  $mesasIds
     * @return array{grupo_codigo: int, mesas: Collection<int, Mesa>, codigos: array<int, string>}
     *
     * @throws \Exception
     */
    public function agrupar(array $mesasIds): array
    {
        return DB::transaction(function () use ($mesasIds) {
            $mesas = $this->mesas->porIds(array_unique($mesasIds));

            if ($mesas->count() !== count(array_unique($mesasIds))) {
                throw new \Exception('Alguna de las mesas indicadas no existe.');
            }

            $noOcupadas = $mesas->where('estado', '!=', 'ocupada');
            if ($noOcupadas->isNotEmpty()) {
                throw new \Exception('Solo se pueden agrupar mesas ocupadas.');
            }

            $grupoCodigo = random_int(100000, 999999);
            $codigos = [];

            foreach ($mesas as $mesa) {
                $mesa->update(['grupo_codigo' => $grupoCodigo]);
                $codigos[$mesa->id] = $mesa->codigo_acceso;
            }

            return [
                'grupo_codigo' => $grupoCodigo,
                'mesas' => $mesas->fresh(),
                'codigos' => $codigos,
            ];
        });
    }

    /**
     * Saca las mesas del grupo.
     *
     * @param  list<int>  $mesasIds
     * @return list<Mesa>
     *
     * @throws \Exception
     */
    public function desagrupar(array $mesasIds): array
    {
        return DB::transaction(function () use ($mesasIds) {
            $mesas = $this->mesas->porIds(array_unique($mesasIds));

            if ($mesas->count() !== count(array_unique($mesasIds))) {
                throw new \Exception('Alguna de las mesas indicadas no existe.');
            }

            foreach ($mesas as $mesa) {
                $mesa->update(['grupo_codigo' => null]);
            }

            return $mesas->fresh()->values()->all();
        });
    }

    // ==================== CUENTA Y RESUMEN ====================

    /**
     * CUENTA DIVIDIDA de una mesa (rebote 2: partes por pedido raíz).
     *
     * Reglas:
     *  - corte por `ocupada_desde`: solo pedidos de la visita actual;
     *  - se excluyen los pedidos `cancelado`, se incluyen los `cerrado`;
     *  - cada PEDIDO RAÍZ es una "parte" (lo que paga una persona) y
     *    acumula sus HIJOS (las repeticiones de esa misma persona);
     *  - el front identifica SU parte con el pedido raíz que guardó en
     *    el dispositivo (reemplaza a la entidad CLIENTE, borrada).
     *
     * Se lee con trashed: sirve aunque la mesa ya se haya destruido
     * (cuenta de la visita terminada).
     *
     * Si la mesa está agrupada, `grupo` trae la cuenta de cada hermana.
     *
     * @return array<string, mixed>
     */
    public function cuenta(int $mesaId): array
    {
        $mesa = $this->mesas->conTrashedOrFail($mesaId);

        $pedidos = $this->pedidos->pedidosDeVisita($mesaId, $mesa->ocupada_desde);

        $porRaiz = [];

        foreach ($pedidos as $pedido) {
            $raizId = (int) ($pedido->pedido_padre_id ?? $pedido->id);

            if (! isset($porRaiz[$raizId])) {
                $porRaiz[$raizId] = [
                    'pedido_id' => $raizId,
                    'pedido_ids' => [],
                    'subtotal' => 0.0,
                    'lineas' => [],
                ];
            }

            $porRaiz[$raizId]['pedido_ids'][] = $pedido->id;

            foreach ($pedido->detalles as $detalle) {
                $porRaiz[$raizId]['lineas'][] = [
                    'detalle_id' => $detalle->id,
                    'pedido_id' => $pedido->id,
                    'plato' => $detalle->plato->nombre,
                    'descuento' => $this->descuentoDeLinea($detalle),
                    'promocion' => $this->promocionDeLinea($detalle),
                    'cantidad' => $detalle->cantidad,
                    'subtotal' => (float) $detalle->subtotal,
                ];
                $porRaiz[$raizId]['subtotal'] += (float) $detalle->subtotal;
            }
        }

        $partes = array_map(fn (array $p) => $p + ['subtotal' => round($p['subtotal'], 2)], array_values($porRaiz));
        usort($partes, fn (array $a, array $b) => $a['pedido_id'] <=> $b['pedido_id']);

        $cuenta = [
            'mesa_id' => $mesa->id,
            'codigo_acceso' => $mesa->codigo_acceso,
            'ocupada_desde' => $mesa->ocupada_desde,
            'partes' => $partes,
            'total' => round(array_sum(array_column($partes, 'subtotal')), 2),
        ];

        if ($mesa->grupo_codigo !== null) {
            $cuenta['grupo'] = $this->mesas->porGrupo($mesa->grupo_codigo, [$mesa->id])
                ->map(fn (Mesa $hermana) => $this->cuenta($hermana->id))
                ->all();
        }

        return $cuenta;
    }

    /**
     * RESUMEN de LECTURA de la mesa: TODOS los pedidos no finalizados
     * con sus líneas y su gate `confirmado` por línea (el front del
     * comensal ubica el suyo por id).
     *
     * @return array<string, mixed>
     */
    public function resumen(int $mesaId): array
    {
        $mesa = $this->mesas->porId($mesaId);

        if (! $mesa) {
            return ['mesa_id' => $mesaId, 'encontrada' => false, 'pedidos' => []];
        }

        $pedidos = $this->pedidos->activosDeMesa($mesaId);

        $resumen = [
            'mesa_id' => $mesa->id,
            'codigo_acceso' => $mesa->codigo_acceso,
            'encontrada' => true,
            'pedidos' => $pedidos
                ->map(fn (Pedido $pedido) => $this->pedidoAArray($pedido))
                ->values()
                ->all(),
        ];

        if ($mesa->grupo_codigo !== null) {
            $resumen['grupo'] = $this->mesas->porGrupo($mesa->grupo_codigo, [$mesa->id])
                ->map(fn (Mesa $hermana) => [
                    'mesa_id' => $hermana->id,
                    'codigo_acceso' => $hermana->codigo_acceso,
                    'pedido_estado' => $this->pedidos->activosDeMesa($hermana->id)->first()?->estado,
                ])
                ->all();
        }

        return $resumen;
    }

    /**
     * Vista de un pedido para el resumen: cabecera + sus líneas con el
     * `confirmado` de cada una y el gate agregado por pedido.
     *
     * @return array<string, mixed>
     */
    private function pedidoAArray(Pedido $pedido): array
    {

        return [
            'id' => $pedido->id,
            'pedido_padre_id' => $pedido->pedido_padre_id,
            'estado' => $pedido->estado,
            'total' => (float) $pedido->total,
            'fecha' => $pedido->fecha,
            'lineas' => $pedido->detalles->map(fn (DetallePedido $detalle) => [
                'detalle_id' => $detalle->id,
                'plato' => $detalle->plato->nombre,
                'promocion' => $this->promocionDeLinea($detalle),
                'cantidad' => $detalle->cantidad,
                'descuento' => $this->descuentoDeLinea($detalle),
                'subtotal' => (float) $detalle->subtotal,
                'confirmado' => (bool) $detalle->confirmado,
            ])->values()->all(),
            'todas_confirmadas' => $this->detalles->sinConfirmar($pedido->id) === 0,
        ];
    }

    private function descuentoDeLinea(DetallePedido $detalle): float
    {
        $agregados = (float) $detalle->ingredientes->where('tipo', 'agregado')->sum('precio_adicional');
        $bruto = ((float) $detalle->precio_lista + $agregados) * $detalle->cantidad;

        return round($bruto - (float) $detalle->subtotal, 2);
    }

    private function promocionDeLinea(DetallePedido $detalle): ?array
    {
        return $detalle->promocion
            ? [
                'id' => $detalle->promocion->id,
                'nombre' => $detalle->promocion->nombre,
                'tipo' => $detalle->promocion->tipo,
            ]
            : null;
    }
}
