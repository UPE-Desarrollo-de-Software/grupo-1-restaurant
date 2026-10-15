<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * PARAMETRO (DER v2.2): configuración del restaurante en clave/valor.
 *
 * PK natural `clave` (sin id surrogate: es una tabla de ajustes, no
 * una entidad con identidad propia). Hoy guarda:
 *
 *   capacidad_total → aforo del salón: la suma de las capacidades de
 *   las mesas vivas no puede superarlo al crear una mesa (MesaService
 *   valida; lo seedea ParametroSeeder y lo actualiza
 *   PUT /api/configuracion como gerente).
 */
class Parametro extends Model
{
    public $incrementing = false;

    protected $primaryKey = 'clave';

    protected $keyType = 'string';

    protected $fillable = [
        'clave',
        'valor',
    ];
}
