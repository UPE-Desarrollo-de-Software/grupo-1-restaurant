<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Producto extends Model
{

    protected $fillable = [
        'categoria_id',
        'nombre',
        'descripcion',
        'precio',
        'imagen',
        'disponible',
    ];

    public function categoria(): BelongsTo
    {
        return $this->belongsTo(Categoria::class);
        //ahora la inversa que un producto pertenece a una categoria
    }

    public function ingredientes()
    {
        return $this->belongsToMany(
            Ingrediente::class,
            'producto_ingrediente',
            'producto_id',
            'ingrediente_id'
        );
    }

    public function detalles(): HasMany
    {
        return $this->hasMany(DetallePedido::class);
    }

    public function AlterDisponibilidad()
    {
        $this->disponible = !$this->disponible;
        $this->save();
    }
}
