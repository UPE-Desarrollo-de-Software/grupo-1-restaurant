<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Sesion extends Model
{
    use HasFactory;

    protected $table = 'sesiones';

    protected $fillable = [
        'mozoID',
        'codigoGrupal',
        'inicio',
        'fin',
        'estado',
    ];

    protected $casts = [
        'inicio' => 'datetime',
        'fin' => 'datetime',
    ];

    // ==================== RELACIONES ====================

    public function mozo()
    {
        return $this->belongsTo(Usuario::class, 'mozoID');
    }

    public function mesas()
    {
        return $this->belongsToMany(Mesa::class, 'mesa_sesion', 'sesionID', 'mesaID');
    }

    public function clientes()
    {
        return $this->hasMany(Cliente::class, 'sesionID');
    }

    // ==================== MÉTODOS ÚTILES ====================

    public function estaActiva(): bool
    {
        return $this->estado === 'activa';
    }

    public function cerrar(): void
    {
        $this->update([
            'estado' => 'cerrada',
            'fin' => now(),
        ]);
    }

    public function expirar(): void
    {
        $this->update([
            'estado' => 'expirada',
            'fin' => now(),
        ]);
    }
}
