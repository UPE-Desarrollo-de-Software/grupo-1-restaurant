<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Mesa extends Model
{
    use HasFactory;

    protected $table = 'mesas';

    protected $fillable = [
        'capacidad',
        'estado',
        'qr',
    ];

    // ==================== RELACIONES ====================

    public function sesiones()
    {
        return $this->belongsToMany(Sesion::class, 'mesa_sesion', 'mesaID', 'sesionID');
    }

    public function Reservar(): void
    {
        $this->update([
            'estado' => 'reservada',
        ]);
    }

    public function estaReservada(): bool
    {

        return $this->estado === 'reservada';
    }

    public function expirarReserva(): void
    {

        $this->update([
            'estado' => 'disponible',
        ]);
    }
}
