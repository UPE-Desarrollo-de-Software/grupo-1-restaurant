<?php

namespace App\UseCases\Reportes;

use App\Services\ReporteService;
use Illuminate\Database\Eloquent\ModelNotFoundException;

/**
 * CASO DE USO: comanda única del historial
 * (GET /api/historial/comandas/{id}, permiso ver_historial_comandas).
 * Para resolver extravíos: mismo shape que un item del listado.
 */
class ObtenerComandaUseCase
{
    public function __construct(private ReporteService $reportes) {}

    /**
     * @return array<string, mixed>
     *
     * @throws ModelNotFoundException
     */
    public function __invoke(int $id): array
    {
        return $this->reportes->comanda($id);
    }
}
