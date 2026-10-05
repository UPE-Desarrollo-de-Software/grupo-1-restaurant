<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Reserva extends Model
{
    protected $fillable = [
        'mesa_id',
        'usuario_id',
        'sesion_id',
        'nombre_cliente',
        'telefono_cliente',
        'fecha',
        'hora',
        'cant_personas',
        'estado',
    ];

    
}
