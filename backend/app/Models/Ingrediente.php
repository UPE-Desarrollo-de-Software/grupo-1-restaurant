<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

/**
 * INGREDIENTE (DER v2.1): insumo de catálogo.
 *
 * Se quitó `opcional`: ese flag ahora vive en el pivot
 * `plato_ingrediente` (por plato). `precioAdicional` es el recargo de
 * catálogo (camelCase: nombre exacto del DER, no normalizar).
 */
class Ingrediente extends Model
{
    use HasFactory;

    protected $fillable = [
        'nombre',
        'precioAdicional',
    ];

    public function platos(): BelongsToMany
    {
        return $this->belongsToMany(
            Plato::class,
            'plato_ingrediente',
            'ingrediente_id',
            'plato_id'
        )->withPivot(['opcional', 'por_defecto']);
    }
}
