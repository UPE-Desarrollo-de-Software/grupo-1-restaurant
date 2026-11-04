<?php

namespace App\UseCases\Platos;

use App\Services\PlatoService;

/**
 * CASO DE USO: aumento masivo de precios de la carta
 * (POST /api/platos/aumentar-precios, permiso gestionar_platos).
 *
 * Ajusta por categoría o toda la carta, con aumento por porcentaje o
 * monto fijo y redondeo opcional a números lindos (50/100). Devuelve
 * los platos afectados con precio_anterior → precio_nuevo.
 */
class AumentarPreciosPlatosUseCase
{
    public function __construct(private PlatoService $platos) {}

    /**
     * @param  array<string, mixed>  $datos
     * @return list<array{id: int, nombre: string, precio_anterior: float, precio_nuevo: float}>
     */
    public function __invoke(array $datos): array
    {
        return $this->platos->aumentarPrecios($datos);
    }
}
