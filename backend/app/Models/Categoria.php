<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
//para que expresemos que una categoria tiene muchos productos

class Categoria extends Model
{

    protected $fillable = [
        'nombre',
        'descripcion',
        'activo',
    ];

    public function productos(): HasMany
    {
        return $this->hasMany(Producto::class);
        //especificamente aca conecto y digo que una categoria tiene mucho productos
    }
}
