<?php

namespace App\Services;

use App\Models\Mesa;
use App\Models\Pedido;
use App\Models\Plato;
use Illuminate\Support\Facades\DB;

/**
 * Lógica de pedidos sobre MESA (DER v2.1).
 *
 * Reglas del cuadro de notas del DER:
 *  - a lo sumo 1 pedido no-finalizado por mesa;
 *  - `cerrado` y `cancelado` son estados finales y liberan la mesa
 *    (mesa.estado ↔ pedido.estado se sincronizan);
 *  - la línea usa `precio_lista` (unitario de catálogo) y `subtotal`;
 *  - los ingredientes se pueden excluir (por_defecto) o agregar
 *    (opcional) según los flags de PLATO_INGREDIENTE; excluir no
 *    modifica el precio, agregar cobra `precioAdicional`.
 */
class PedidoService
{
    /**
     * Estados finales del DER: liberan la mesa y no admiten cambios.
     *
     * @var list<string>
     */
    private const ESTADOS_FINALES = ['cerrado', 'cancelado'];

    /**
     * Agrega líneas al pedido "en curso" de una mesa (lo crea si no
     * existe).
     *
     * @param  array<int, array{plato_id: int, cantidad: int, ingredientes?: list<int>, excluir?: list<int>}>  $lineas
     * @return Pedido
     *
     * @throws \Exception
     */
    public function agregarProducto(int $mesaId, array $lineas)
    {
        return DB::transaction(function () use ($mesaId, $lineas) {
            $mesa = Mesa::findOrFail($mesaId);

            // Regla del DER: 1 pedido no-finalizado por mesa.
            $pedido = Pedido::where('mesa_id', $mesaId)
                ->whereNotIn('estado', self::ESTADOS_FINALES)
                ->first();

            if ($pedido && $pedido->estado !== 'en_curso') {
                throw new \Exception(
                    'La mesa tiene un pedido ya enviado: no se pueden agregar mas productos hasta cerrarlo.'
                );
            }

            // Si no hay pedido abierto, lo creamos y ocupamos la mesa.
            if (! $pedido) {
                $pedido = Pedido::create([
                    'mesa_id' => $mesa->id,
                    'estado' => 'en_curso',
                    'total' => 0,
                    'fecha' => now(),
                ]);

                $mesa->ocupar();
            }

            foreach ($lineas as $linea) {
                $pedido->total += $this->agregarLinea($pedido, $linea);
            }

            $pedido->save();

            return $pedido->load(
                'detalles.plato',
                'detalles.ingredientes.ingrediente'
            );
        });
    }

    /**
     * Una línea del pedido: valida plato/ingredientes contra
     * PLATO_INGREDIENTE, crea el detalle y sus filas de
     * DETALLE_INGREDIENTE (excluido/agregado).
     *
     * @param  array{plato_id: int, cantidad: int, ingredientes?: list<int>, excluir?: list<int>}  $linea
     */
    private function agregarLinea(Pedido $pedido, array $linea): float
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
        $plato = Plato::with('ingredientes')->findOrFail($linea['plato_id']);
        $ingredientesPlato = $plato->ingredientes;

        $precioUnitario = (float) $plato->precio;

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
        // El descuento queda en 0 hasta integrar el motor de promociones
        // en los pedidos (PLAN-promociones.md).
        $subtotal = round($precioUnitario * $cantidad, 2);

        $detalle = $pedido->detalles()->create([
            'plato_id' => $plato->id,
            'cantidad' => $cantidad,
            'precio_lista' => $plato->precio,
            'subtotal' => $subtotal,
        ]);

        foreach (array_unique($agregados) as $ingredienteId) {
            $ingrediente = $ingredientesPlato->firstWhere('id', $ingredienteId);

            $detalle->ingredientes()->create([
                'ingrediente_id' => $ingredienteId,
                'tipo' => 'agregado',
                'precio_adicional' => $ingrediente->precioAdicional,
            ]);
        }

        foreach (array_unique($excluidos) as $ingredienteId) {
            $detalle->ingredientes()->create([
                'ingrediente_id' => $ingredienteId,
                'tipo' => 'excluido',
                'precio_adicional' => null,
            ]);
        }

        return $subtotal;
    }

    /**
     * Pasa el pedido "en curso" a "enviado" (hacia cocina).
     *
     * @throws \Exception
     */
    public function enviarPedido(int $pedidoId)
    {
        return DB::transaction(function () use ($pedidoId) {
            $pedido = Pedido::findOrFail($pedidoId);

            if ($pedido->estado !== 'en_curso') {
                throw new \Exception('Solo se puede enviar un pedido que este en curso.');
            }

            if ($pedido->detalles()->count() === 0) {
                throw new \Exception('No se puede enviar un pedido vacio.');
            }

            $pedido->estado = 'enviado';
            $pedido->save();

            return $pedido->load('detalles.plato', 'detalles.ingredientes.ingrediente');
        });
    }

    /**
     * Avanza el pedido por el flujo del DER:
     *   enviado → en_preparacion → entregado → cerrado
     * y permite cancelar desde cualquier estado no final.
     * Al llegar a un estado final se libera la mesa.
     *
     * @throws \Exception
     */
    public function cambiarEstado(int $pedidoId, string $nuevoEstado)
    {
        $transiciones = [
            'en_curso' => ['enviado', 'cancelado'],
            'enviado' => ['en_preparacion', 'cancelado'],
            'en_preparacion' => ['entregado', 'cancelado'],
            'entregado' => ['cerrado', 'cancelado'],
        ];

        return DB::transaction(function () use ($pedidoId, $nuevoEstado, $transiciones) {
            $pedido = Pedido::with('mesa')->findOrFail($pedidoId);

            $permitidos = $transiciones[$pedido->estado] ?? [];

            if (! in_array($nuevoEstado, $permitidos, true)) {
                throw new \Exception(
                    "No se puede pasar de '{$pedido->estado}' a '{$nuevoEstado}'."
                );
            }

            $pedido->estado = $nuevoEstado;
            $pedido->save();

            // Estado final: libera la mesa si no quedan pedidos activos.
            if (in_array($nuevoEstado, self::ESTADOS_FINALES, true)) {
                $quedanActivos = $pedido->mesa
                    ->pedidos()
                    ->whereNotIn('estado', self::ESTADOS_FINALES)
                    ->exists();

                if (! $quedanActivos) {
                    $pedido->mesa->liberar();
                }
            }

            return $pedido->load('mesa', 'detalles.plato');
        });
    }

    /**
     * Pedido no finalizado de una mesa (null si no hay).
     */
    public function pedidoActivoDeMesa(int $mesaId): ?Pedido
    {
        return Pedido::where('mesa_id', $mesaId)
            ->whereNotIn('estado', self::ESTADOS_FINALES)
            ->with('detalles.plato', 'detalles.ingredientes.ingrediente')
            ->first();
    }
}
