<?php

namespace App\Services;

use App\Exceptions\ApiException;
use App\Models\Pago;
use App\Repositories\PagoRepository;

/**
 * PAGOS — servicio de dominio (DER v3.2: integración Mercado Pago
 * Checkout Pro). Capa Service sobre el puerto PagoRepository +
 * adaptador externo MercadoPagoService.
 *
 * Reglas (siempre server-side, el cliente nunca manda montos):
 *  - saldo de la visita: `pendiente = total_vigente − Σ pagos
 *    aprobados`; "pagar total" cobra ese saldo. Los pagos
 *    `en_proceso` (MP con fondos retenidos) NO cuentan;
 *  - "pagar mi parte": cobra el subtotal de la RAÍZ del comensal
 *    menos lo que esa parte ya abonó (pagos `mi_parte` de esa raíz +
 *    los pagos `total` que la cubrieron; ver `saldo()`);
 *  - el monto nace en 0 con la preferencia creada (`pendiente`) y el
 *    webhook es quien lo aprueba: sin notificación firmada no hay
 *    pago aprobado;
 *  - idempotencia por `mp_payment_id` UNIQUE: una notificación
 *    repetida no duplica ni re-aprueba;
 *  - red de seguridad contra el doble cobro: antes de ofrecer un
 *    `init_point` nuevo se consulta a MP si ya cobró para alguna
 *    intención pendiente (el webhook pudo perderse) y se bloquea si
 *    hay un pago `en_proceso` (ver `iniciarPago`).
 */
class PagoService
{
    /**
     * Mensaje cuando MP ya tiene un pago de la visita sin resolver:
     * el comensal no debe volver a pagar (se acredita solo).
     */
    public const MENSAJE_PAGO_EN_PROCESO = 'Hay un pago en proceso de acreditación. Esperá unos minutos antes de volver a pagar.';

    public function __construct(
        private PagoRepository $pagos,
        private MercadoPagoService $mercadoPago,
    ) {}

    // ==================== SALDO ====================

    /**
     * Saldo de la visita + pagado y pendiente por PARTE (para que el
     * comensal vea cuánto le falta y el mozo, el "Pagado por MP").
     *
     * El reparto por parte se hace en orden cronológico y en centavos:
     *  - un pago `mi_parte` sólo cubre la raíz que lo pagó;
     *  - un pago `total` sólo cubre las partes que ya existían cuando
     *    se cobró (`parte.fecha <= pago.fecha`), en orden de pedido_id
     *    y hasta el subtotal de cada una; una parte pedida DESPUÉS del
     *    pago queda con `pagado = 0`.
     * El nivel visita (total / pagado / pendiente) sigue siendo la suma
     * cruda de los pagos aprobados.
     *
     * @param  array<string, mixed>  $cuenta  salida de MesaService::cuenta()
     * @return array{
     *     total: float,
     *     pagado: float,
     *     pendiente: float,
     *     partes: list<array{pedido_id: int, subtotal: float, pagado: float, pendiente: float}>
     * }
     */
    public function saldo(array $cuenta): array
    {
        $pagados = $this->pagos->aprobadosDeMesa((int) $cuenta['mesa_id']);
        $totalPagado = round((float) $pagados->sum('monto'), 2);
        $total = (float) $cuenta['total'];

        // Reparto en CENTAVOS: evita el drift de los float y garantiza
        // que la suma por partes sea igual a lo cobrado en la visita.
        $techo = [];
        $cubierto = [];
        $creacion = [];
        $idsOrdenados = [];

        foreach ($cuenta['partes'] as $parte) {
            $raizId = (int) $parte['pedido_id'];
            $techo[$raizId] = (int) round(((float) $parte['subtotal']) * 100);
            $cubierto[$raizId] = 0;
            $creacion[$raizId] = (string) ($parte['fecha'] ?? '');
            $idsOrdenados[] = $raizId;
        }

        usort($idsOrdenados, fn (int $a, int $b) => $a <=> $b);

        foreach ($pagados as $pago) {
            $monto = (int) round((float) $pago->monto * 100);

            if ($monto <= 0) {
                continue;
            }

            if ($pago->tipo === Pago::TIPO_MI_PARTE) {
                $raizId = (int) $pago->pedido_id;

                if (array_key_exists($raizId, $cubierto)) {
                    $cubierto[$raizId] += $monto;
                }

                continue;
            }

            // Pago 'total': sólo las partes vigentes al momento del cobro.
            $momentoPago = (string) $pago->fecha;
            $elegibles = array_values(array_filter(
                $idsOrdenados,
                fn (int $raizId) => $creacion[$raizId] !== '' && $creacion[$raizId] <= $momentoPago,
            ));

            foreach ($elegibles as $raizId) {
                if ($monto <= 0) {
                    break;
                }

                $aCubrir = min(max($techo[$raizId] - $cubierto[$raizId], 0), $monto);
                $cubierto[$raizId] += $aCubrir;
                $monto -= $aCubrir;
            }

            // Si sobró (pago mayor a lo disponible), queda en la última
            // parte elegible: la suma por partes iguala lo cobrado.
            if ($monto > 0 && $elegibles !== []) {
                $cubierto[$elegibles[count($elegibles) - 1]] += $monto;
            }
        }

        $partes = [];

        foreach ($cuenta['partes'] as $parte) {
            $raizId = (int) $parte['pedido_id'];
            $subtotal = round((float) $parte['subtotal'], 2);
            $pagadoParte = round($cubierto[$raizId] / 100, 2);

            $partes[] = [
                'pedido_id' => $raizId,
                'subtotal' => $subtotal,
                'pagado' => $pagadoParte,
                'pendiente' => round(max($subtotal - $pagadoParte, 0), 2),
            ];
        }

        return [
            'total' => round($total, 2),
            'pagado' => $totalPagado,
            'pendiente' => round(max($total - $totalPagado, 0), 2),
            'partes' => $partes,
        ];
    }

    // ==================== HISTORIAL ====================

    /**
     * Pagos de la visita (para el comensal y el resumen del mozo),
     * ordenados por fecha. No expone ids internos de MP.
     *
     * @return list<array<string, mixed>>
     */
    public function historial(int $mesaId): array
    {
        return $this->pagos->deMesa($mesaId)
            ->map(fn (Pago $pago) => [
                'id' => $pago->id,
                'tipo' => $pago->tipo,
                'monto' => round((float) $pago->monto, 2),
                'estado' => $pago->estado,
                'medio_pago' => $pago->medio_pago,
                'pedido_id' => $pago->pedido_id !== null ? (int) $pago->pedido_id : null,
                'fecha' => $pago->fecha?->toIso8601String(),
            ])
            ->values()
            ->all();
    }

    /**
     * Detalle de UN pago de Mercado Pago: el JSON crudo que guardó
     * `procesarNotificacion` (fee_details con cada comisión,
     * transaction_details con el neto acreditado, etc.).
     *
     * No consulta la API de MP: sirve lo persistido (pagos anteriores
     * al guardado o sin procesar devuelven `mp_detalle` en null).
     *
     * @return array{pago_id: int, monto: float, estado: string, medio_pago: string, mp_detalle: array<string, mixed>|null}
     *
     * @throws \Exception (422) no existe, de otra mesa o es efectivo
     */
    public function detalle(int $pagoId, int $mesaId): array
    {
        $pago = $this->pagos->porId($pagoId);

        if ($pago === null) {
            throw new \Exception('No se encontró ese pago.');
        }

        $this->exigirMesaPropia($pago, $mesaId);

        if ($pago->medio_pago !== Pago::MEDIO_MERCADO_PAGO) {
            throw new \Exception('Ese pago no fue con Mercado Pago.');
        }

        return [
            'pago_id' => $pago->id,
            'monto' => round((float) $pago->monto, 2),
            'estado' => $pago->estado,
            'medio_pago' => $pago->medio_pago,
            'mp_detalle' => $pago->mp_detalle,
        ];
    }

    // ==================== ALTA DE PAGO ====================

    /**
     * Registra un cobro en EFECTIVO (POST /mesas/{mesa}/pagos): el
     * mozo cobra la cuenta al cerrar la visita y deja el pago
     * `aprobado` con `medio_pago = efectivo` — sin Mercado Pago de
     * por medio, nace aprobado.
     *
     * El monto lo manda el mozo (saldo precargado y editable), pero
     * se valida server-side contra el saldo vigente de la cuenta.
     *
     * @param  array<string, mixed>  $cuenta  salida de MesaService::cuenta()
     *
     * @throws ApiException (422) hay un pago en proceso en MP
     * @throws \Exception (422) monto inválido o mayor al saldo pendiente
     */
    public function registrarEfectivo(array $cuenta, float $monto): Pago
    {
        $mesaId = (int) $cuenta['mesa_id'];

        // Red de seguridad contra el doble cobro: si MP tiene fondos
        // retenidos, cobrar en efectivo encima duplicaría el cargo.
        if ($this->tienePagoEnProceso($mesaId)) {
            throw new ApiException(422, self::MENSAJE_PAGO_EN_PROCESO);
        }

        if ($monto <= 0) {
            throw new \Exception('El monto del cobro en efectivo tiene que ser mayor a cero.');
        }

        $saldo = $this->saldo($cuenta);

        if ($monto > $saldo['pendiente'] + 0.01) {
            throw new \Exception('El monto no puede superar el saldo pendiente de la cuenta.');
        }

        return $this->pagos->crear([
            'mesa_id' => $mesaId,
            'tipo' => Pago::TIPO_TOTAL,
            'monto' => round($monto, 2),
            'estado' => Pago::ESTADO_APROBADO,
            'medio_pago' => Pago::MEDIO_EFECTIVO,
        ]);
    }

    /**
     * Monto a cobrar para un tipo de pago (server-side).
     *
     * @param  array<string, mixed>  $cuenta  salida de MesaService::cuenta()
     *
     * @throws \Exception (422) parte inexistente o cuenta ya saldada
     */
    public function montoACobrar(array $cuenta, string $tipo, ?int $pedidoRaizId): float
    {
        $saldo = $this->saldo($cuenta);

        if ($tipo === Pago::TIPO_TOTAL) {
            $monto = $saldo['pendiente'];
            $mensaje = 'La cuenta ya está saldada.';
        } else {
            $parte = $this->parteDe($saldo['partes'], $pedidoRaizId);
            $monto = $parte['pendiente'];
            $mensaje = 'Tu parte ya está saldada.';
        }

        if ($monto <= 0) {
            throw new \Exception($mensaje);
        }

        return $monto;
    }

    /**
     * Crea (o reutiliza) el PAGO pendiente y le asocia la preferencia
     * de Checkout Pro. Devuelve `init_point` + ids.
     *
     * Si ya existe un pago `pendiente` del mismo tipo/parté con el
     * mismo monto, se reutiliza su preferencia (no se duplica la
     * intención de pago); si el monto cambió (se pidió más comida) el
     * viejo se cancela y se crea uno nuevo.
     *
     * @param  array<string, mixed>  $cuenta  salida de MesaService::cuenta()
     * @return array{init_point: string, preference_id: string, pago_id: int, monto: float}
     *
     * @throws ApiException (503) módulo apagado · \Exception (422) sin monto
     */
    public function iniciarPago(array $cuenta, string $tipo, ?int $pedidoRaizId, string $titulo): array
    {
        $this->mercadoPago->exigirHabilitado();

        $mesaId = (int) $cuenta['mesa_id'];

        // Red de seguridad contra el doble cobro: reconcilia con MP lo
        // que el webhook pudo no avisar y bloquea si queda algo sin
        // resolver (422) o si MP ni siquiera responde (502).
        $this->reconciliarConMercadoPago($mesaId);

        $monto = $this->montoACobrar($cuenta, $tipo, $pedidoRaizId);

        $pendiente = $this->pagos->deMesa($mesaId)
            ->first(fn (Pago $pago) => $pago->estado === Pago::ESTADO_PENDIENTE
                && $pago->tipo === $tipo
                && (int) $pago->pedido_id === (int) $pedidoRaizId);

        // Reutiliza la preferencia si el monto sigue vigente.
        if ($pendiente !== null && abs((float) $pendiente->monto - $monto) < 0.01 && $pendiente->mp_preference_id !== null) {
            $preferencia = $this->mercadoPago->consultarPreferencia($pendiente->mp_preference_id);

            return [
                'init_point' => $preferencia['init_point'],
                'preference_id' => $pendiente->mp_preference_id,
                'pago_id' => $pendiente->id,
                'monto' => round($monto, 2),
            ];
        }

        // El monto cambió: la vieja intención de pago ya no sirve.
        if ($pendiente !== null) {
            $pendiente->update(['estado' => Pago::ESTADO_CANCELADO]);
        }

        $pago = $this->pagos->crear([
            'mesa_id' => $mesaId,
            'pedido_id' => $tipo === Pago::TIPO_MI_PARTE ? $pedidoRaizId : null,
            'tipo' => $tipo,
            'monto' => round($monto, 2),
            'estado' => Pago::ESTADO_PENDIENTE,
        ]);

        try {
            $preferencia = $this->mercadoPago->crearPreferencia([
                'titulo' => $titulo,
                'monto' => $monto,
                // El webhook identifica el PAGO con esto.
                'referencia_externa' => (string) $pago->id,
                'notificacion' => $this->urlBase().'/api/webhooks/mercado-pago',
                'retorno' => $this->urlRetorno(),
            ]);
        } catch (\Exception $e) {
            // No llegó a existir la intención de pago en MP.
            $pago->delete();

            throw $e;
        }

        $pago->update(['mp_preference_id' => $preferencia['preference_id']]);

        return [
            'init_point' => $preferencia['init_point'],
            'preference_id' => $preferencia['preference_id'],
            'pago_id' => $pago->id,
            'monto' => round($monto, 2),
        ];
    }

    // ==================== NOTIFICACIÓN ====================

    /**
     * Procesa la notificación de MP: consulta el pago REAL en la API
     * (fuente de verdad) y actualiza la fila correspondiente.
     *
     * Idempotente: si el pago ya estaba aprobado con ese
     * `mp_payment_id`, no hace nada. Si el monto notificado no
     * coincide con el registrado, NO aprueba (fraude o
     * preferencia manipulada).
     *
     * @return Pago|null null si la notificación no corresponde a un
     *                   pago nuestro (external_reference desconocido)
     *
     * @throws ApiException (502) si MP no responde
     */
    public function procesarNotificacion(string $paymentId): ?Pago
    {
        $this->mercadoPago->exigirHabilitado();

        $pagoMp = $this->mercadoPago->consultarPago($paymentId);

        $pagoId = (int) ($pagoMp['external_reference'] ?? 0);
        $pago = $pagoId > 0 ? $this->pagos->porId($pagoId) : null;

        if ($pago === null) {
            return null;
        }

        // Blindaje contra la reutilización de `external_reference` (son
        // ids chicos: si la base se recrea, un pago VIEJO de MP puede
        // traer la misma referencia que esta fila): sólo sirve si viene
        // de la preferencia de ESTA fila. Si MP no trae la preferencia
        // no se puede desambiguar y se procesa como siempre.
        $preferenciaMp = $pagoMp['preference_id'] ?? null;

        if ($preferenciaMp !== null && (string) $preferenciaMp !== (string) $pago->mp_preference_id) {
            return null;
        }

        $estado = $this->mercadoPago->estadoDesdeMp($pagoMp['status'] ?? null);

        // Solo el importe correcto puede aprobar.
        $montoMp = (float) ($pagoMp['transaction_amount'] ?? 0);

        if ($estado === Pago::ESTADO_APROBADO && abs($montoMp - (float) $pago->monto) >= 0.01) {
            return $pago;
        }

        $mismoIntento = $pago->mp_payment_id === (string) $paymentId;

        // Idempotencia: notificación repetida sin cambio → no-op.
        if ($mismoIntento && $pago->estado === $estado) {
            return $pago;
        }

        // Un intento DISTINTO no degrada un pago ya acreditado: MP
        // reintenta cada notificación cada 15 min y el rechazo de un
        // intento anterior puede llegar después del aprobado.
        if (! $mismoIntento && $pago->estado === Pago::ESTADO_APROBADO) {
            return $pago;
        }

        // Mismo pago que cambia de estado (p. ej. aprobado →
        // reembolsado) o primer/último intento: reflejar siempre.
        // El JSON crudo de MP (fee_details, transaction_details…) queda
        // guardado para exponerlo por /cliente/pagos/{id}/detalle.
        $pago->update([
            'estado' => $estado,
            'mp_payment_id' => (string) $paymentId,
            'mp_detalle' => $pagoMp,
        ]);

        return $pago;
    }

    /**
     * Verificación del retorno del checkout (POST /cliente/pagos/
     * verificar): reutiliza la lógica del webhook SIN firma porque la
     * pide el comensal identificado.
     *
     *  - con `paymentId` (parámetro de la URL) procesa ese pago real
     *    contra MP (fuente de verdad, idempotente);
     *  - sólo con `preferenceId` busca el pago por la preferencia y
     *    reconcilia contra MP (el webhook pudo perderse).
     *
     * En ambos casos el pago tiene que ser de la visita que lo pide.
     *
     * @return Pago|null null si MP no tiene pagos para esa referencia
     *
     * @throws ApiException (502) si MP no responde
     * @throws \Exception (422) si el pago pertenece a otra mesa
     */
    public function verificarRetorno(int $mesaId, string $paymentId, string $preferenceId): ?Pago
    {
        $this->mercadoPago->exigirHabilitado();

        if ($paymentId !== '') {
            $pago = $this->procesarNotificacion($paymentId);

            if ($pago === null) {
                throw new \Exception('No se encontró ningún pago con esa referencia.');
            }

            $this->exigirMesaPropia($pago, $mesaId);

            return $pago;
        }

        $pago = $this->pagos->porPreferenceId($preferenceId);

        if ($pago === null) {
            throw new \Exception('No se encontró ningún pago con esa referencia.');
        }

        $this->exigirMesaPropia($pago, $mesaId);

        // Reconciliación: MP es la fuente de verdad (el webhook pudo
        // haberse perdido o estar en cola).
        foreach ($this->mercadoPago->pagosPorReferenciaExterna((string) $pago->id) as $pagoMp) {
            $idMp = (string) ($pagoMp['id'] ?? '');

            if ($idMp !== '') {
                $this->procesarNotificacion($idMp);
            }
        }

        return $pago->fresh();
    }

    // ==================== INTERNAS ====================

    /**
     * Red de seguridad contra el doble cobro (antes de ofrecer un
     * `init_point` nuevo):
     *
     *  1. si la visita ya tiene un pago `en_proceso` (MP retiene
     *     fondos), bloquea con 422: el comensal no debe volver a
     *     pagar, el pago se acredita solo;
     *  2. reconcilia las intenciones `pendientes` contra la API de MP
     *     (el webhook pudo perderse): cada pago real encontrado se
     *     procesa con la misma lógica idempotente del webhook — si MP
     *     ya cobró, el saldo lo refleja y `montoACobrar` responde 422;
     *  3. vuelve a bloquear si la reconciliación dejó algo
     *     `en_proceso`.
     *
     * Si MP no responde, la ApiException (502) se propaga: sin
     * confirmación de MP no se ofrece un nuevo checkout.
     *
     * @throws ApiException (422) pago en proceso · (502) MP sin responder
     */
    private function reconciliarConMercadoPago(int $mesaId): void
    {
        if ($this->tienePagoEnProceso($mesaId)) {
            throw new ApiException(422, self::MENSAJE_PAGO_EN_PROCESO);
        }

        $pendientes = $this->pagos->deMesa($mesaId)
            ->filter(fn (Pago $pago) => $pago->estado === Pago::ESTADO_PENDIENTE);

        foreach ($pendientes as $pago) {
            $pagosMp = $this->mercadoPago->pagosPorReferenciaExterna((string) $pago->id);

            foreach ($pagosMp as $pagoMp) {
                $paymentId = (string) ($pagoMp['id'] ?? '');

                if ($paymentId !== '') {
                    // Misma vía del webhook: consulta el pago real en
                    // MP y aplica estado + idempotencia.
                    $this->procesarNotificacion($paymentId);
                }
            }
        }

        if ($this->tienePagoEnProceso($mesaId)) {
            throw new ApiException(422, self::MENSAJE_PAGO_EN_PROCESO);
        }
    }

    /**
     * ¿La visita tiene algún pago con fondos retenidos en MP?
     */
    private function tienePagoEnProceso(int $mesaId): bool
    {
        return $this->pagos->deMesa($mesaId)
            ->contains(fn (Pago $pago) => $pago->estado === Pago::ESTADO_EN_PROCESO);
    }

    /**
     * El pago tiene que pertenecer a la visita que lo pide (el
     * comensal sólo ve pagos de SU mesa).
     *
     * @throws \Exception (422) si es de otra mesa
     */
    private function exigirMesaPropia(Pago $pago, int $mesaId): void
    {
        if ((int) $pago->mesa_id !== $mesaId) {
            throw new \Exception('Ese pago no corresponde a esta mesa.');
        }
    }

    /**
     * Base pública del back (para notification_url).
     */
    private function urlBase(): string
    {
        return rtrim((string) (config('services.mercadopago.app_url') ?: config('app.url')), '/');
    }

    /**
     * URL de retorno del checkout: vive en el FRONT (SPA), que puede
     * estar en otro dominio que el back. `MP_RETURN_URL` vacío cae a
     * la misma base del back (despliegue mono-dominio).
     */
    private function urlRetorno(): string
    {
        return rtrim((string) (config('services.mercadopago.return_url') ?: $this->urlBase()), '/').'/pedido';
    }

    /**
     * @param  list<array{pedido_id: int, subtotal: float, pagado: float, pendiente: float}>  $partes
     * @return array{pedido_id: int, subtotal: float, pagado: float, pendiente: float}
     *
     * @throws \Exception (422) la raíz no pertenece a la cuenta
     */
    private function parteDe(array $partes, ?int $pedidoRaizId): array
    {
        foreach ($partes as $parte) {
            if ($parte['pedido_id'] === $pedidoRaizId) {
                return $parte;
            }
        }

        throw new \Exception('Esa parte no pertenece a esta cuenta.');
    }
}
