<?php

namespace App\UseCases\Reservas;

use App\Services\PreordenService;
use Illuminate\Database\Eloquent\ModelNotFoundException;

/**
 * CASO DE USO: vaciar la pre-orden de la reserva con su PIN
 * (DELETE /api/cliente/reservas/{codigo}/preordenes, público con
 * throttle). Solo mientras la reserva siga `pendiente`.
 *
 * @throws ModelNotFoundException no hay ninguna reserva con ese PIN
 *                                (el controller responde 401, igual
 *                                que /acceso)
 * @throws \Exception reserva no pendiente (422)
 */
class EliminarPreordenWebUseCase
{
    public function __construct(private PreordenService $preordenes) {}

    public function __invoke(string $codigo): void
    {
        $this->preordenes->eliminarPorCodigo($codigo);
    }
}
