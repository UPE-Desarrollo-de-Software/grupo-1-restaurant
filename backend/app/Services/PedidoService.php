<?php

namespace App\Services;

use App\Models\Pedido;
use App\Models\Producto;
use Illuminate\Support\Facades\DB;

class PedidoService
{
    /**
     * Agrega uno o varios productos al pedido "en selección" de la sesión.
     *
     * @param  array<int, array{producto_id: int, cantidad: int, ingredientes?: array<int, int>}>  $productos
     */
    public function agregarProducto(int $sessionId, array $productos, ?int $clienteId = null)
    {
        return DB::transaction(function () use ($sessionId, $productos, $clienteId) {
            // valido que exista la sesion
            if (! DB::table('sesiones')->where('id', $sessionId)->exists()) {
                throw new \Exception(
                    'La sesión no existe'
                );
            }

            // busco si ya hay un pedido en seleccion para la sesion
            $pedido = Pedido::where('sesion_id', $sessionId)
                ->where('estado', 'en_seleccion')
                ->first();

            // si en la sesion no hay pedido lo creo
            if (! $pedido) {
                $pedido = Pedido::create([
                    'sesion_id' => $sessionId,
                    'cliente_id' => $clienteId,
                    'estado' => 'en_seleccion',
                    'total' => 0,
                    'fecha' => now(),
                ]);
            }

            // recorro todos los productos
            foreach ($productos as $productData) {
                $productoId = $productData['producto_id'];
                $cantidad = $productData['cantidad'];
                $ingredientesSeleccionados = $productData['ingredientes'] ?? [];

                // valido cantidades
                if ($cantidad <= 0) {
                    throw new \Exception(
                        'La cantidad debe ser mayor a 0.'
                    );
                }

                // tambien valido que no se repitan ingredientes adicionales
                $ingredientesSeleccionados = array_unique($ingredientesSeleccionados);

                // busco el producto que llega, junto con sus ingredientes
                $producto = Producto::with('ingredientes')->findOrFail($productoId);

                // traigo el precio inicial del producto antes de agregarle adicionales
                $precioUnitario = $producto->precio;

                // traigo los ingredientes del producto
                $ingredientesProducto = $producto->ingredientes;

                // valido los ingredientes base y valido los agregados sumandolos
                foreach ($ingredientesSeleccionados as $ingredienteId) {
                    $ingrediente = $ingredientesProducto->firstWhere('id', $ingredienteId);

                    if (! $ingrediente) {
                        throw new \Exception(
                            'El ingrediente seleccionado no pertenece al producto'
                        );
                    }

                    // verifico que sean opcionales los ingredientes agregados
                    if (! $ingrediente->opcional) {
                        throw new \Exception(
                            'El ingrediente seleccionado no es opcional'
                        );
                    }

                    // sumamos los ingredientes opcionales
                    $precioUnitario += $ingrediente->precioAdicional;
                }

                // creo el detalle una vez que recibo el pedido para el producto actual
                $detalle = $pedido->detalles()->create([
                    'producto_id' => $producto->id,
                    'cantidad' => $cantidad,
                    'precio' => $precioUnitario,
                ]);

                // guardo los ingredientes seleccionados en un detalle especifico
                foreach ($ingredientesSeleccionados as $ingredienteId) {
                    $ingrediente = $ingredientesProducto->firstWhere('id', $ingredienteId);

                    $detalle->ingredientes()->create([
                        'ingrediente_id' => $ingredienteId,
                        'precio_adicional' => $ingrediente->precioAdicional,
                    ]);
                }

                // al final sumo el subtotal del producto al total del pedido
                $pedido->total += $precioUnitario * $cantidad;
            }

            $pedido->save();

            return $pedido->load(
                'detalles.producto',
                'detalles.ingredientes'
            );
        });
    }

    /**
     * Pasa el pedido "en selección" a "recibido" para que llegue a cocina.
     */
    public function enviarPedido(int $sessionId)
    {
        return DB::transaction(function () use ($sessionId) {
            // busco el pedido que aun este en_seleccion de la sesion
            $pedido = Pedido::where('sesion_id', $sessionId)
                ->where('estado', 'en_seleccion')
                ->first();

            // verifico que exista
            if (! $pedido) {
                throw new \Exception(
                    'No hay un pedido en selección para esta sesión.'
                );
            }

            // verifico que hayan productos en el pedido
            if ($pedido->detalles()->count() === 0) {
                throw new \Exception(
                    'No se puede enviar un pedido vacío.'
                );
            }

            // cambio el estado a 'recibido' para que llegue a cocina y no se modifique mas
            $pedido->estado = 'recibido';

            // guardo el pedido
            $pedido->save();

            // devuelvo el pedido con detalles
            return $pedido->load(
                'detalles.producto',
                'detalles.ingredientes'
            );
        });
    }
}
