<?php

namespace App\Services;

use App\Models\Plato;
use App\Models\Promocion;
use Carbon\CarbonInterface;

/**
 * Motor de promociones fiel al DER v2.1.
 *
 * Se eliminaron `ambito` y `condiciones` (JSON con hora/días/cantidad
 * mínima) para ser fieles al diagrama: el alcance de una promo lo dan
 *  - `platos.promocion_id`     → oferta vigente en la carta (catálogo), y
 *  - `detalle_pedidos.promocion_id` → descuento congelado (histórico).
 *
 * La integración de estas fórmulas dentro de PedidoService sigue
 * pendiente (ver PLAN-promociones.md).
 */
class PromocionService
{
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

    // Pendientes (PLAN-promociones.md): elegir la mejor promo de una
    // línea / de un pedido y devolver el mapa por plato.
    public function mejorParaLinea() {}

    public function mejorParaPedido() {}

    public function paraPlatos() {}
}
