<?php

namespace App\Http\Controllers;

use App\Exceptions\ApiException;
use App\Models\Mesa;
use App\UseCases\Pagos\CrearPreferenciaPagoUseCase;
use App\UseCases\Pagos\ObtenerPagosMesaUseCase;
use App\UseCases\Pagos\ProcesarNotificacionPagoUseCase;
use App\UseCases\Pagos\RegistrarPagoEfectivoUseCase;
use App\UseCases\Pagos\VerificarPagoUseCase;
use Illuminate\Http\Request;

/**
 * PAGOS del comensal con Mercado Pago — Checkout Pro (DER v3.2).
 *
 * Flujo:
 *   GET  /cliente/pagos          → saldo + historial + flag habilitado
 *   POST /cliente/pagos          → crea la preferencia y devuelve
 *                                  `init_point` (el front redirige)
 *   POST /cliente/pagos/verificar → reconcilia el retorno del
 *                                  checkout contra MP (polling del
 *                                  front; misma lógica que el webhook)
 *   POST /mesas/{mesa}/pagos     → cobro en EFECTIVO registrado por
 *                                  el mozo al cerrar la visita
 *   POST /webhooks/mercado-pago  → notificación de MP (vía pública,
 *                                  firma HMAC obligatoria): la fuente
 *                                  de verdad del estado del pago.
 *
 * El monto SIEMPRE lo calcula el backend (nunca viene del body),
 * salvo el cobro en efectivo: lo manda el mozo pero se valida
 * server-side contra el saldo vigente.
 */
class PagoController extends Controller
{
    public function __construct(
        private ObtenerPagosMesaUseCase $obtenerPagos,
        private CrearPreferenciaPagoUseCase $crearPreferencia,
        private ProcesarNotificacionPagoUseCase $procesarNotificacion,
        private VerificarPagoUseCase $verificarPago,
        private RegistrarPagoEfectivoUseCase $registrarEfectivo,
    ) {}

    /**
     * GET /cliente/pagos — saldo de la visita (total/pagado/pendiente
     * por parte), historial de pagos y feature flag.
     */
    public function index(Request $request)
    {
        /** @var Mesa $mesa */
        $mesa = $request->attributes->get('cliente_mesa');

        return response()->json(($this->obtenerPagos)($mesa), 200);
    }

    /**
     * POST /cliente/pagos — inicia un pago. Body:
     *  - `tipo`: 'total' | 'mi_parte' (obligatorio);
     *  - `pedido_id`: raíz del comensal (obligatorio si tipo es
     *    'mi_parte', opcional/ignorado en 'total').
     *
     * Responde con `init_point` (URL de Checkout Pro) para que el
     * front redirija al comensal.
     */
    public function crear(Request $request)
    {
        /** @var Mesa $mesa */
        $mesa = $request->attributes->get('cliente_mesa');

        $datos = $request->validate([
            'tipo' => 'required|string|in:total,mi_parte',
            'pedido_id' => 'nullable|integer|exists:pedidos,id',
        ]);

        if ($datos['tipo'] === 'mi_parte' && empty($datos['pedido_id'])) {
            return response()->json([
                'message' => 'Para pagar tu parte necesitás indicar tu pedido.',
            ], 422);
        }

        try {
            $preferencia = ($this->crearPreferencia)(
                $mesa,
                $datos['tipo'],
                $datos['pedido_id'] ?? null,
            );
        } catch (ApiException $e) {
            // 503 (módulo apagado) / 502 (MP caído): se propagan.
            throw $e;
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'mensaje' => 'Pago iniciado correctamente.',
            'init_point' => $preferencia['init_point'],
            'preference_id' => $preferencia['preference_id'],
            'pago_id' => $preferencia['pago_id'],
            'monto' => $preferencia['monto'],
        ], 201);
    }

    /**
     * POST /cliente/pagos/verificar — el comensal vuelve del checkout
     * y pregunta por su pago. Body (al menos uno):
     *  - `payment_id`: id del pago en MP (parámetro del retorno);
     *  - `preference_id`: preferencia del retorno (fallback).
     *
     * Reutiliza la lógica del webhook contra la API de MP (sin firma:
     * la mesa está identificada por el Bearer codigo_acceso y el pago
     * tiene que ser de SU mesa). Responde con el resultado de la
     * verificación + saldo/historial refrescados (una sola request
     * para el polling del front).
     */
    public function verificar(Request $request)
    {
        /** @var Mesa $mesa */
        $mesa = $request->attributes->get('cliente_mesa');

        $datos = $request->validate([
            'payment_id' => 'nullable|string',
            'preference_id' => 'nullable|string',
        ]);

        if (empty($datos['payment_id']) && empty($datos['preference_id'])) {
            return response()->json([
                'message' => 'No se recibió ninguna referencia del pago.',
            ], 422);
        }

        try {
            $resultado = ($this->verificarPago)($mesa, $datos);
        } catch (ApiException $e) {
            // 503 (módulo apagado) / 502 (MP caído): se propagan.
            throw $e;
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json($resultado, 200);
    }

    /**
     * POST /mesas/{mesa}/pagos — cobro en EFECTIVO (permiso
     * tomar_pedidos): el mozo cobra la cuenta al cerrar la visita.
     * Body:
     *  - `monto`: importe cobrado (saldo pendiente precargado y
     *    editable; validado server-side contra el saldo vigente).
     *
     * El pago nace `aprobado` con `medio_pago = efectivo` (no pasa
     * por Mercado Pago). Responde con el pago y el saldo refrescado.
     */
    public function cobrarEfectivo(Request $request, Mesa $mesa)
    {
        $datos = $request->validate([
            'monto' => 'required|numeric|min:0.01',
        ]);

        try {
            $resultado = ($this->registrarEfectivo)($mesa, (float) $datos['monto']);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'message' => 'Cobro en efectivo registrado.',
            ...$resultado,
        ], 201);
    }

    /**
     * POST|GET /webhooks/mercado-pago — notificación de Mercado Pago
     * (vía pública: la llama MP, no el comensal).
     *
     * Valida la firma HMAC `x-signature` (401 si falla) y procesa el
     * pago contra la API de MP (fuente de verdad). Idempotente.
     */
    public function notificacion(Request $request)
    {
        $headers = [];

        foreach ($request->headers->all() as $clave => $valor) {
            $headers[$clave] = is_array($valor) ? (string) reset($valor) : (string) $valor;
        }

        try {
            $resultado = ($this->procesarNotificacion)(
                $headers,
                $request->query(),
                $request->input() ?? [],
            );
        } catch (ApiException $e) {
            // 401 (firma) / 502 (MP caído): se propagan tal cual.
            throw $e;
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        // Siempre 200 a MP (evita reintentos); el detalle queda en el body.
        return response()->json($resultado, 200);
    }
}
