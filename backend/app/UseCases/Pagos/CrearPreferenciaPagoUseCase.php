<?php

namespace App\UseCases\Pagos;

use App\Models\Mesa;
use App\Services\MesaService;
use App\Services\PagoService;

/**
 * CASO DE USO: iniciar un pago con Mercado Pago Checkout Pro
 * (POST /api/cliente/pagos).
 *
 * El monto SIEMPRE lo calcula el backend contra la cuenta vigente:
 *  - `total` → saldo de la visita (total − pagos aprobados);
 *  - `mi_parte` → subtotal de la raíz del comensal − lo que esa
 *    parte ya abonó.
 *
 * @return array<string, mixed>
 */
class CrearPreferenciaPagoUseCase
{
    public function __construct(
        private MesaService $mesas,
        private PagoService $pagos,
    ) {}

    /**
     * @param  string  $tipo  'total' | 'mi_parte'
     * @return array<string, mixed>
     *
     * @throws \Exception (422) sin monto a cobrar · ApiException (503) módulo apagado
     */
    public function __invoke(Mesa $mesa, string $tipo, ?int $pedidoRaizId): array
    {
        $cuenta = $this->mesas->cuenta($mesa->id);

        $titulo = $tipo === 'mi_parte'
            ? "Mi parte — Mesa {$mesa->id}"
            : "Cuenta mesa {$mesa->id}";

        return $this->pagos->iniciarPago($cuenta, $tipo, $pedidoRaizId, $titulo);
    }
}
