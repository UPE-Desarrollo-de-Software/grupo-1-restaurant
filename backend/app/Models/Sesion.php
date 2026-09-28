<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Laravel\Sanctum\HasApiTokens;

class Sesion extends Model
{
    use HasApiTokens;
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

    // ==================== MÉTODOS ÚTILES ====================

    public function estaActiva(): bool
    {
        return $this->estado === 'activa';
    }

    public function cerrar(): void
    {
        $this->update([
            'codigoGrupal' => null,
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
