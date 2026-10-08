<?php

namespace App\Services;

use App\Models\Promocion;
use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;
use App\Models\Producto;
use Illuminate\Support\Collection;

class PromocionService
{
    public function vigente(Promocion $p, ?CarbonInterface $fecha = null): bool //validaciones de la promocion
    {

        $ahora = $fecha ?? now();

        if (! $p->activo) return false;
        if ($p->fecha_inicio && $ahora->lt($p->fecha_inicio)) return false;
        if ($p->fecha_fin && $ahora->gt($p->fecha_fin->endOfDay()))  return false;

        //validar si endOfDay esta bien aplicado

        $c = $p->condiciones ?? [];

        if (isset($c['horaDesde'], $c['horaHasta'])) {
            $hora = $ahora->format('H:i');
            $desde = Carbon::parse($c['horaDesde'])->format('H:i');
            $hasta = Carbon::parse($c['horaHasta'])->format('H:i');
            // si la franja cruza la media noche la logica se invierte
            $dentroDeLaFranja = $desde <= $hasta ? ($hora >= $desde && $hora <= $hasta) : ($hora >= $desde || $hora <= $hasta);
            if (! $dentroDeLaFranja) return false;
        }

        if (isset($c['dias']) && ! in_array($ahora->dayOfWeek(), $c['dias'], true)) return false;

        return true;
    }

    public function subtotal(Promocion $p, float $precioLista, int $cantidad): float
    {
        $c = $p->condiciones ?? [];
        //cantidad (vale para cualquier tipo de promocion)
        if (isset($c['cantidadMinima']) && $cantidad < $c['cantidadMinima']) {
            return round($precioLista * $cantidad, 2);
        }

        $unitario = match ($p->tipo) {
            'porcentaje'  => $precioLista * (1 - $p->valor / 100),
            'monto_fijo'  => max(0, $precioLista - $p->valor),
            'precio_fijo' => min($p->valor, $precioLista),   // nunca más caro que la lista
            //validar en el controller por valor = null

            '2x1'         => null,                            // caso especial, abajo
            default       => $precioLista,
        };

        if ($p->tipo === '2x1') {
            $pares = intdiv($cantidad, 2);
            $impares = $cantidad % 2;
            return round($precioLista * ($pares + $impares), 2);
        }

        return round($unitario * $cantidad, 2);
    }

    public function descuento(Promocion $p, float $monto): float
    {
        if ($p->ambito === 'pedido') {
            return match ($p->tipo) {
                'porcentaje' => round($monto * ($p->valor / 100), 2),
                'monto_fijo' => min($p->valor, $monto),
                default      => 0,
            };
        };
        return 0;
    }

    private function candidatasParaLinea(Producto $p): Collection
    {
        return Promocion::query()
            ->where('ambito', '!=', 'pedido')
            ->where(fn($q) => $q
                ->whereHas('productos',  fn($x) => $x->where('productos.id', $p->id))
                ->orWhereHas('categorias', fn($x) => $x->where('categorias.id', $p->categoria_id)))
            ->get()
            ->filter(fn($promo) => $this->vigente($promo))
            ->values();
    }

    public function mejorParaLinea() {}
    public function mejorParaPedido() {}
    public function paraProductos() {}
}
