<?php

namespace App\Services;

use App\Models\Sesion;
use App\Models\Usuario;
use App\Models\Mesa;
use App\Models\Reserva;
use Illuminate\Database\Eloquent\Collection;
use Carbon\Carbon;

class ReservaService
{
    public function crearReserva(array $datos)
    {
        $this->validarCapacidad($datos['mesa_id'], $datos['cant_personas']);

        $this->validarDisponibilidad($datos['mesa_id']);

        $this->validarConflictoHorario($datos['mesa_id'], $datos['fecha'], $datos['hora']);

        $reserva = Reserva::create([
            'mesa_id' => $datos['mesa_id'],
            'usuario_id' => $datos['usuario_id'] ?? null,
            'nombre_cliente' => $datos['nombre_cliente'],
            'telefono_cliente' => $datos['telefono_cliente'],
            'fecha' => $datos['fecha'],
            'hora' => $datos['hora'],
            'cant_personas' => $datos['cant_personas'],
            'estado' => 'pendiente',
        ]);

        return $reserva;
    }

    public function validarCapacidad(int $mesaId, int $cantPersonas)
    {
        $mesa = Mesa::find($mesaId);

        if(!$mesa){
            throw new \Exception(
                'La mesa no existe'
            );
        }

        if($cantPersonas > $mesa->capacidad){
            throw new \Exception(
                'La cantidad de personas supera capacidad de mesa'
            );
        }

        return $mesa;
    }

    public function validarDisponibilidad(int $mesaId)
    {
        $mesa = Mesa::find($mesaId);

        if(!$mesa){
            throw new \Exception(
                'La mesa no existe'
            );
        }
        if($mesa->estado !== 'disponible'){
            throw new \Exception(
                'Mesa no disponible para reservar'
            );
        }
    }

    public function validarConflictoHorario(int $mesaId, string $fecha, string $hora)
    {
        $conflicto = Reserva::where('mesa_id', $mesaId)
            ->where('fecha', $fecha)
            ->where('hora', $hora)
            ->whereIn('estado', ['pendiente'])
            ->exists();

        if($conflicto){
            throw new \Exception(
                'Hay una reserva agendada en esa misma fecha y hora'
            );
        }
    }

    public function cancelarReserva(int $reservaId)
    {
        //busco la reserva a cancelar, si no existe muestro error
        $reserva = Reserva::find($reservaId);

        if(!$reserva){
            throw new \Exception(
                'La reserva buscada no existe'
            );
        }
        //verifico que la reserva que se quiere cancelar este pendiente, de otra manera no se podria cancelar nada
        if($reserva->estado !== 'pendiente'){
            throw new \Exception(
                'Solo se pueden cancelar reservas con estado pendiente'
            );
        }

        //una vez encontrada, cambio su estado a cancelada, la guardo y devuelvo eso
        $reserva->estado = 'cancelada';
        $reserva->save();

        return $reserva;

    }


    //rehacer funcion completa y separar en dos (agregar inasistencia)
    public function finalizarReserva(int $reservaId)
    {
        $reserva = Reserva::find($reservaId);

        //verifico que la reserva que se quiere finalizar este pendiente
        if($reserva->estado !== 'pendiente'){
            throw new \Exception(
                'Solo se pueden finalizar reservas con estado pendiente'
            );
        }

        //al tener fecha y hora separados parseo con carbon (clase de laravel para manejar fechas y horas) para armar una misma estructura
        $fechaHoraReserva = Carbon::parse(
            $reserva->fecha . '' . $reserva->hora
        );

        //y aca agarro el momento de ahora fecha y hora actual
        $ahora = Carbon::now();

        //comparo ahora con la fecha y hora de la reserva mediante lt (less than) para consultar si la actual es menor que la hora esperada de reserva
        if($ahora ->lt($fechaHoraReserva))
            {
                throw new \Exception(
                    'Aún no llegó la hora de la reserva'
                );
            }
        $reserva->estado = 'finalizada';
        $reserva->save();

        return $reserva;
    }
}