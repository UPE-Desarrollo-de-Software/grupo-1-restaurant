<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Mesa extends Model
{
    use HasFactory;

    protected $table = 'mesas';

    protected $fillable = [
        'numero_mesa',
        'capacidad',
        'estado',
        'qr',
    ];

    // ==================== RELACIONES ====================

    public function sesiones()
    {
        return $this->belongsToMany(Sesion::class, 'mesa_sesion', 'mesaID', 'sesionID');
    }
}
