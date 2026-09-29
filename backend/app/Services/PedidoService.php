<?php

namespace App\Services;

use App\Models\Pedido;
use App\Models\Producto;
use Illuminate\Support\Facades\DB;

class PedidoService
{
    public function agregarProducto(string $sessionId, int $productoId, int $cantidad, array $ingredientesSeleccionados = [])
    {
        return Db::transaction(function () use($sessionId, $productoId, $cantidad, $ingredientesSeleccionados)
        {
            //antes de buscar valido cantidades para evitar buscar innecesariamente
            if($cantidad <= 0){
                throw new \Exception(
                    "La cantidad debe ser mayor a 0"
                );
            }
            //valido que exista la sesion
            if(!DB::table('sessions')->where('id', $sessionId)->exists()){
                throw new \Exception(
                    "La sesión no existe"
                );
            }
            //tambien valido que no se repitan ingredientes adicionales
            $ingredientesSeleccionados = array_unique($ingredientesSeleccionados);

            //busco el producto que llega
            $producto = Producto::with('ingredientes')->findOrFail($productoId);

            //traigo el precio inicial del producto antes de agregarle adicionales
            $precioUnitario = $producto->precio;

            //traigo los ingredientes del producto
            $ingredientesProducto = $producto->ingredientes;

            //valido los ingredientes base y valido los agregados sumandolos 
            foreach($ingredientesSeleccionados as $ingredienteId)
                {
                    $ingrediente = $ingredientesProducto->firstWhere('id', $ingredienteId);

                    if(!$ingrediente){
                        throw new \Exception(
                            "El ingrediente seleccionado no pertenece al producto"
                        );
                    }

                    //verifico que sean opcionales los ingredientes agregados
                    if(!$ingrediente->opcional){
                        throw new \Exception(
                            "El ingrediente seleccionado no es opcional"
                        );
                    }

                    //sumamos los ingredientes opcionales
                    if($ingrediente->opcional){
                        $precioUnitario += $ingrediente->precioAdicional;
                    }
                }

                //busco el pedido de la sesion
                $pedido = Pedido::create(
                    [
                        'session_id' => $sessionId,
                    ],
                    [
                        'estado' => 'recibido',
                        'total' => 0,
                        'fecha' => now(),
                    ]
                );

                //creo el detalle una vez que recibo el pedido
                $detalle = $pedido->detalles()->create([
                    'producto_id' => $producto->id,
                    'cantidad' => $cantidad,
                    'precio' =>$precioUnitario,
                ]);

                //ahora guardo los ingredientes seleccionados
                foreach($ingredientesSeleccionados as $ingredienteId){
                    $ingrediente = $ingredientesProducto->firstWhere('id', $ingredienteId);

                    //guardo los ingredientes seleccionados en un detalle especifico
                    $detalle->ingredientes()->create([
                        'ingrediente_id' => $ingredienteId,
                        'precio_adicional' => $ingrediente->precioAdicional,
                    ]);
                }

                //yy al final actualizo el total del pedido + los adicionales
                $pedido->total += $precioUnitario * $cantidad;
                $pedido->save();

                return $detalle;
        });

    }
}