<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Promocion extends Model
{
    protected $fillable = [
        'nombre',
        'tipo',
        'valor',
        'ambito',
        'fecha_inicio',
        'fecha_fin',
        'condiciones',
        'activo'
    ];

    protected $casts = [
        'condiciones' => 'array',
        'fecha_inicio' => 'datetime',
        'fecha_fin' => 'datetime',
        'activo' => 'boolean',

    ];

    public function productos()
    {
        return $this->belongsToMany(Producto::class, 'promocion_producto', 'promocion_id', 'producto_id');
    }

    public function categorias()
    {
        return $this->belongsToMany(Categoria::class, 'promocion_categoria', 'promocion_id', 'categoria_id');
    }
}
