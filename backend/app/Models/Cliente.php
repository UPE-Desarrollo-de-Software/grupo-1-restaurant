<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Laravel\Sanctum\HasApiTokens;

/**
 * CLIENTE — ENTIDAD CONGELADA (fuera del DER v2.1: "dividir la cuenta"
 * y clientes recurrentes quedaron fuera del MVP). Se conserva el modelo
 * y su tabla, pero no tiene rutas ni middleware activos en el flujo de
 * pedidos. Ver documentacion/DER-v2.1-backend.md.
 */
class Cliente extends Model
{
    use HasApiTokens;
    use HasFactory;

    protected $fillable = [
        'sesionID',
        'nombre',
    ];

    public function sesion()
    {
        return $this->belongsTo(Sesion::class, 'sesionID');
    }
}
