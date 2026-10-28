<?php

namespace App\UseCases\Clientes;

use App\Events\AtencionSolicitada;
use App\Models\Mesa;

/**
 * CASO DE USO: el comensal pide atención ("llamar al mozo") desde su
 * mesa. Emite `AtencionSolicitada`, que avisa a los mozOS
 * (`empleado.atencion`) y confirma en la propia mesa (`mesa.{id}`).
 *
 * El rate limit por mesa (1/min) vive en el controller, igual que el
 * throttle de `acceder`.
 */
class LlamarMozoUseCase
{
    public function __invoke(Mesa $mesa): void
    {
        event(new AtencionSolicitada($mesa));
    }
}
