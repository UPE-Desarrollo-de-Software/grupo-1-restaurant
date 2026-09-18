<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Ingrediente extends Model
{

    protected $fillable = [
        'nombre',
        'opcional',
        'precioAdicional',
    ];

    public function productos()
    {
        return $this->belongsToMany(
            Producto::class,
            'producto_ingrediente',
            'ingrediente_id',
            'producto_id'
        );
    }
}
