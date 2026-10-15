<?php

namespace App\Repositories;

/**
 * Puerto de persistencia de PARAMETRO (capa Repository): ajustes del
 * restaurante en clave/valor.
 */
interface ParametroRepository
{
    /**
     * Valor crudo de un parámetro, null si nadie lo cargó.
     */
    public function valor(string $clave): ?string;

    /**
     * Aforo del lugar (`capacidad_total`); default defensivo 100 si
     * la clave no está cargada.
     */
    public function capacidadTotal(): int;

    /**
     * Crea o actualiza un parámetro.
     */
    public function establecer(string $clave, string $valor): void;
}
