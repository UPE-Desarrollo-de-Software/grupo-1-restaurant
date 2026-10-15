<?php

namespace App\Exceptions;

use Exception;

/**
 * Excepción de aplicación con estado HTTP propio (arquitectura
 * hexagonal: los UseCases/Services lanzan dominio, no arman respuestas).
 *
 * Se registra en bootstrap/app.php con un renderable: cualquier
 * ApiException que salga de la pila Controller → UseCase → Service →
 * Repository se convierte en JSON {message} con el código indicado,
 * sin try/catch en cada controller.
 */
class ApiException extends Exception
{
    public function __construct(
        public readonly int $status,
        string $message,
    ) {
        parent::__construct($message);
    }
}
