<?php

namespace App\Services;

use App\Models\Plato;
use App\Models\Promocion;
use App\Repositories\PromocionRepository;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Motor de promociones fiel al DER v2.2.
 *
 * Se eliminaron `ambito` y `condiciones` (JSON con hora/días/cantidad
 * mínima) para ser fieles al diagrama: el alcance de una promo lo dan
 *  - `platos.promocion_id`     → oferta vigente en la carta (catálogo), y
 *  - `detalle_pedidos.promocion_id` → descuento congelado (histórico).
 *
 * Integrado (PLAN-promociones.md): PedidoService::agregarLinea congela
 * `promocion_id` y aplica el descuento al agregar la línea; este service
 * recalcula las líneas de pedidos NO finales al editar tipo/valor.
 */
class PromocionService
{
    public function __construct(private PromocionRepository $promociones) {}

    // ==================== ABM ====================

    /** @return Collection<int, Promocion> */
    public function listar(): Collection
    {
        return $this->promociones->listar();
    }

    /** @throws ModelNotFoundException */
    public function obtenerPorId(int $id): Promocion
    {
        return $this->promociones->porId($id);
    }

    /**
     * @param  array<string, mixed>  $datos
     *
     * @throws \Exception si una regla del DER viola (controller → 422)
     */
    public function crear(array $datos): Promocion
    {
        return $this->promociones->crear($this->normalizar($datos));
    }

    /**
     * @param  array<string, mixed>  $datos
     *
     * @throws \Exception si una regla del DER viola (controller → 422)
     */
    public function actualizar(int $id, array $datos): Promocion
    {
        return DB::transaction(function () use ($id, $datos) {
            $datos = $this->normalizar($datos);           // antes de comparar (2x1 anula valor)
            $promo = $this->promociones->porId($id);

            // Solo un cambio de ECONOMÍA de la promo mueve líneas ya pedidas:
            // nombre/fechas/activo afectan únicamente a líneas nuevas.
            $cambioEconomico =
                $promo->tipo !== $datos['tipo']
                || (float) ($promo->valor ?? 0) !== (float) ($datos['valor'] ?? 0);

            $promo = $this->promociones->actualizar($promo, $datos);

            if ($cambioEconomico && $this->promociones->tieneDetalleHistorico($promo)) {
                $this->recalcularLineasAbiertas($promo);
            }

            return $promo;
        });
    }

    /**
     * Baja. Si ya se aplicó en líneas de pedido NO se borra (el
     * descuento congelado perdería la referencia de qué promo fue):
     * 422 con "desactivala". Libre si solo está en la carta (las FK
     * de platos y detalle_pedidos son nullOnDelete).
     */
    public function eliminar(int $id): void
    {
        $promo = $this->promociones->porId($id);

        if ($this->promociones->tieneDetalleHistorico($promo)) {
            throw new \Exception(
                'La promo ya se aplicó en pedidos: no se puede eliminar, desactivala.'
            );
        }

        $this->promociones->eliminar($promo);
    }

    private function normalizar(array $datos): array
    {
        if ($datos['tipo'] === '2x1') {
            $datos['valor'] = null;
        } else {
            if (! isset($datos['valor'])) {
                throw new \Exception('Este tipo de promo requiere un valor.');
            }

            $valor = (float) $datos['valor'];

            $reglas = match ($datos['tipo']) {
                'porcentaje' => $valor > 0 && $valor <= 100,
                'monto_fijo', 'precio_fijo' => $valor >= 0,
                default => false,
            };

            if (! $reglas) {
                throw new \Exception(match ($datos['tipo']) {
                    'porcentaje' => 'un porcentaje debe estar entre 1 y 100.',
                    default => 'el valor no puede ser negativo.',
                });
            }
        }

        // ventana de fechas

        if (isset($datos['fecha_inicio'], $datos['fecha_fin']) && $datos['fecha_inicio'] > $datos['fecha_fin']) {

            throw new \Exception('La fecha fin debe ser posterior a la fecha inicio.');
        }

        return $datos;
    }

    /**
     * ¿Está vigente la promo en la carta? (activo + ventana de fechas).
     */
    public function vigente(Promocion $p, ?CarbonInterface $fecha = null): bool
    {
        $ahora = $fecha ?? now();

        if (! $p->activo) {
            return false;
        }

        if ($p->fecha_inicio && $ahora->lt($p->fecha_inicio)) {
            return false;
        }

        if ($p->fecha_fin && $ahora->gt($p->fecha_fin->endOfDay())) {
            return false;
        }

        return true;
    }

    /**
     * Subtotal de la línea aplicando la promo, según su tipo.
     * Fórmulas (cuadro de notas del DER, sin acumulabilidad):
     *   porcentaje  → cantidad × precio_lista × (1 − valor/100)
     *   monto_fijo  → cantidad × max(0, precio_lista − valor)
     *   precio_fijo → cantidad × min(valor, precio_lista)
     *   2x1         → floor(cantidad / 2) × precio_lista (+ las impares)
     */
    public function subtotal(Promocion $p, float $precioLista, int $cantidad): float
    {
        $unitario = match ($p->tipo) {
            'porcentaje' => $precioLista * (1 - $p->valor / 100),
            'monto_fijo' => max(0, $precioLista - $p->valor),
            'precio_fijo' => min($p->valor, $precioLista), // nunca más caro que la lista
            '2x1' => null, // caso especial, abajo
            default => $precioLista,
        };

        if ($p->tipo === '2x1') {
            $pares = intdiv($cantidad, 2);
            $impares = $cantidad % 2;

            return round($precioLista * ($pares + $impares), 2);
        }

        return round($unitario * $cantidad, 2);
    }

    /**
     * Descuento total de la línea, derivado como diferencia entre el
     * precio de lista y el subtotal con promo.
     */
    public function descuento(Promocion $p, float $precioLista, int $cantidad): float
    {
        return round($precioLista * $cantidad - $this->subtotal($p, $precioLista, $cantidad), 2);
    }

    /**
     * Promo de catálogo vigente de un plato (FK platos.promocion_id).
     * Es la "candidata" de línea: 1 plato : 0..1 promo.
     */
    public function promoDePlato(Plato $plato): ?Promocion
    {
        $promo = $plato->promocion;

        if (! $promo || ! $this->vigente($promo)) {
            return null;
        }

        return $promo;
    }

    private function recalcularLineasAbiertas(Promocion $promo): void
    {
        $totales = []; // pedido_id => Pedido (ya cargado por el repo)

        foreach ($this->promociones->detallesAplicadosEnPedidosNoFinales($promo) as $detalle) {
            $agregados = (float) $detalle->ingredientes->where('tipo', 'agregado')->sum('precio_adicional');

            $detalle->update([
                'subtotal' => round(
                    $this->subtotal($promo, (float) $detalle->precio_lista, $detalle->cantidad)
                        + $agregados * $detalle->cantidad,
                    2
                ),
            ]);

            $totales[$detalle->pedido_id] = $detalle->pedido;
        }

        foreach ($totales as $pedido) {
            $pedido->total = round((float) $pedido->detalles()->sum('subtotal'), 2);
            $pedido->save();
        }
    }
}
