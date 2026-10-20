<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * CONFIG_MESA (DER del grupo): una fila de la composición del salón.
 *
 * "hay `cantidad` mesas de `capacidad` cubiertos". Flotante (sin FK a
 * MESA): describe el POTENCIAL del salón, no las mesas instanciadas.
 * De la tabla se derivan dos límites que valida MesaService:
 *
 *   aforo            = Σ(capacidad × cantidad)  → cubiertos máximos
 *   cantidadMaxima   = Σ cantidad                → mesas máximas vivas
 *
 * El seed base es 25×4 (aforo 100; ver ConfigMesaSeeder). Se edita
 * con PUT /api/configuracion (replace-all, permiso gestionar_mesas).
 */
class ConfigMesa extends Model
{
    protected $fillable = [
        'cantidad',
        'capacidad',
    ];
}
