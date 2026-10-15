<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * PLATO (DER v2.2). Antes se llamaba Producto (tabla `productos`); el
 * nombre del diagrama es PLATO, así que el modelo, la tabla
 * (`platos`), el controlador y el servicio siguen esa convención.
 */
class Plato extends Model
{
    use HasFactory;

    protected $table = 'platos';

    protected $fillable = [
        'categoria_id',
        'promocion_id',
        'nombre',
        'descripcion',
        'precio',
        'imagen',
        'disponible',
    ];

    public function categoria(): BelongsTo
    {
        return $this->belongsTo(Categoria::class);
    }

    /**
     * Oferta vigente en la carta (DER: PLATO 0..1 PROMOCION, FK
     * opcional). nullable: la mayoría de los platos no tiene promo.
     */
    public function promocion(): BelongsTo
    {
        return $this->belongsTo(Promocion::class);
    }

    /**
     * Ingredientes del plato con los flags `opcional` / `por_defecto`
     * (tabla pivot `plato_ingrediente`).
     */
    public function ingredientes(): BelongsToMany
    {
        return $this->belongsToMany(
            Ingrediente::class,
            'plato_ingrediente',
            'plato_id',
            'ingrediente_id'
        )->withPivot(['opcional', 'por_defecto']);
    }

    public function detalles(): HasMany
    {
        return $this->hasMany(DetallePedido::class);
    }

    public function AlterDisponibilidad()
    {
        $this->disponible = ! $this->disponible;
        $this->save();
    }
}
