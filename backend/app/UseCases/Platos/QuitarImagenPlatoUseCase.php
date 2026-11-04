<?php

namespace App\UseCases\Platos;

use App\Models\Plato;
use App\Services\PlatoService;

class QuitarImagenPlatoUseCase
{
    public function __construct(private PlatoService $platos) {}

    public function __invoke(int $id): Plato
    {
        return $this->platos->quitarImagen($id);
    }
}
