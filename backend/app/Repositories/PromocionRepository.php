<?php

namespace App\Repositories;

use App\Models\Promocion;
use Illuminate\Support\Collection;

interface PromocionRepository
{
    /**
     * Todas las promociones del catálogo.
     *
     * @return Collection<int, Promocion>
     */
    public function listar(): Collection;

    public function porId(int $id): Promocion;

    /**
     * @param  array<string, mixed>  $datos
     */
    public function crear(array $datos): Promocion;

    /**
     * @param  array<string, mixed>  $datos
     */
    public function actualizar(Promocion $promocion, array $datos): Promocion;

    public function eliminar(Promocion $promocion): void;

    public function tieneDetalleHistorico(Promocion $promo): bool;
}
