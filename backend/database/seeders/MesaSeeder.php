<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Mesa;

class MesaSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        for ($i = 1; $i <= 4; $i++) {
            Mesa::create([
                'capacidad' => 4,
                'estado' => 'disponible',
                'qr' => "QR mesa {$i}",
            ]);
        }
    }
}
