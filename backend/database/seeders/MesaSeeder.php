<?php

namespace Database\Seeders;

use App\Models\Mesa;
use App\Models\Usuario;
use Illuminate\Database\Seeder;

/**
 * Mesas del salón (DER v2.1): estado 'libre', código de mesa visible
 * y mozo responsable asignado (relación USUARIO "atiende" MESA).
 * Idempotente por codigo_mesa.
 */
class MesaSeeder extends Seeder
{
    public function run(): void
    {
        // Mozo que queda a cargo de las mesas (lo crea UsuarioSeeder).
        $mozo = Usuario::whereHas('rol', function ($query) {
            $query->where('nombre', 'Mozo');
        })->first();

        for ($i = 1; $i <= 4; $i++) {
            Mesa::updateOrCreate(
                ['codigo_mesa' => $i],
                [
                    'usuario_id' => $mozo?->id,
                    'capacidad' => 4,
                    'estado' => 'libre',
                    'qr' => "QR mesa {$i}",
                ]
            );
        }
    }
}
