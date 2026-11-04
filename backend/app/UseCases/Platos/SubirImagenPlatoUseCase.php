<?php

namespace App\UseCases\Platos;

use App\Models\Plato;
use App\Services\PlatoService;
use Illuminate\Http\UploadedFile;

class SubirImagenPlatoUseCase
{
    public function __construct(private PlatoService $platos) {}

    public function __invoke(int $id, UploadedFile $archivo): Plato
    {
        return $this->platos->subirImagen($id, $archivo);
    }
}
