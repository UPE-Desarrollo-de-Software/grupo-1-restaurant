<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

/**
 * INGREDIENTE (DER v2.2): insumo de catálogo.
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
        )->withPivot(['opcional', 'por_defecto', 'precio_adicional']);
    }

    /**
     * Recargo efectivo de este ingrediente en el plato desde el que se
     * cargó la relación: el override del pivot si existe, si no el
     * recargo de catálogo. `0` es un override válido, por eso se compara
     * contra `null` y no por truthiness.
     */
    public function precioAdicionalParaPlato(): float
    {
        $delPlato = $this->pivot?->precio_adicional;

        return (float) ($delPlato ?? $this->precioAdicional);
    }
}
