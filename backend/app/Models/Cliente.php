<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Laravel\Sanctum\HasApiTokens;

class Cliente extends Model
{
    use HasApiTokens;
    use HasFactory;

    protected $fillable = [
        'sesionID',
        'nombre',
    ];

    public function sesion()
    {
        return $this->belongsTo(Sesion::class, 'sesionID');
    }
}
