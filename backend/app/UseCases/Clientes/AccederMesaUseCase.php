<?php

namespace App\UseCases\Clientes;

use App\Exceptions\ApiException;
use App\Models\Mesa;
use App\Services\MesaService;

/**
 * CASO DE USO: acceso del comensal a su mesa (POST /api/acceso,
 * público con throttle). Valida el `codigo_acceso` y devuelve la mesa:
 * el front guarda el código (y el pedido raíz) en su localStorage y lo
 * manda como `Authorization: Bearer <codigo>` en cada pedido.
 *
 * @throws ApiException 401 código inválido o mesa destruida
 */
class AccederMesaUseCase
{
    public function __construct(private MesaService $mesas) {}

    public function __invoke(string $codigo): Mesa
    {
        return $this->mesas->accederConCodigo($codigo);
    }
}
