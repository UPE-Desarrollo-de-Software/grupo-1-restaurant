<?php

namespace App\UseCases\Pagos;

use App\Exceptions\ApiException;
use App\Models\Mesa;
use App\Services\MercadoPagoService;
use App\Services\PagoService;

/**
 * CASO DE USO: verificar el pago al volver del checkout
 * (POST /api/cliente/pagos/verificar — vía del comensal).
 *
 * El retorno de Checkout Pro trae `payment_id` / `preference_id` en
 * la URL, pero la URL no es fuente de verdad: este caso reutiliza la
 * MISMA lógica del webhook (`PagoService::verificarRetorno`)
 * contra la API de MP, sin firma (lo pide el comensal identificado
 * con su codigo_acceso, y el pago resultante debe ser de SU mesa).
 *
 * Devuelve el resultado de la verificación + el saldo refrescado
 * (misma forma que GET /cliente/pagos) para que el front haga una
 * sola request en el polling.
 *
 * @return array<string, mixed>
 */
class VerificarPagoUseCase
{
    public function __construct(
        private PagoService $pagos,
        private MercadoPagoService $mercadoPago,
        private ObtenerPagosMesaUseCase $obtenerPagos,
    ) {}

    /**
     * @param  array<string, mixed>  $datos  `payment_id` y/o `preference_id` del retorno
     * @return array<string, mixed>
     *
     * @throws ApiException (503) módulo apagado · (502) MP sin responder
     * @throws \Exception (422) sin referencia o pago de otra mesa
     */
    public function __invoke(Mesa $mesa, array $datos): array
    {
        $this->mercadoPago->exigirHabilitado();

        $paymentId = trim((string) ($datos['payment_id'] ?? ''));
        $preferenceId = trim((string) ($datos['preference_id'] ?? ''));

        if ($paymentId === '' && $preferenceId === '') {
            throw new \Exception('No se recibió ninguna referencia del pago.');
        }

        $pago = $this->pagos->verificarRetorno(
            (int) $mesa->id,
            $paymentId,
            $preferenceId,
        );

        return [
            'verificacion' => [
                'pago_id' => $pago?->id,
                'estado' => $pago?->estado,
            ],
            ...($this->obtenerPagos)($mesa),
        ];
    }
}
