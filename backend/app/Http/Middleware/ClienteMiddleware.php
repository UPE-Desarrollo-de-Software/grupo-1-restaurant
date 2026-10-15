<?php

namespace App\Http\Middleware;

use App\Exceptions\ApiException;
use App\Models\Mesa;
use App\Services\MesaService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * MIDDLEWARE DE COMENSAL (rebote 2, sin CLIENTE ni tokens).
 *
 * Protege las rutas `/cliente/*`. El comensal se identifica con el
 * CODIGO DE ACCESO de su mesa en la cabecera:
 *
 *   Authorization: Bearer <codigo_acceso>
 *
 * El código resuelve la mesa VIGENTE (viva): si la mesa se destruye,
 * el código deja de valer y cada request responde 401. No hay sesión
 * ni token: la identidad ("mi pedido") la guarda el front en su
 * dispositivo y la manda como `pedido_id` en cada llamada.
 *
 * Un token de empleado (formato Sanctum `id|secreto`) no pasa:
 * responde 403 como antes.
 */
class ClienteMiddleware
{
    public function __construct(private MesaService $mesas) {}

    public function handle(Request $request, Closure $next): Response
    {
        $codigo = $request->bearerToken();

        if ($codigo === null || $codigo === '') {
            return response()->json([
                'message' => 'Falta el codigo de acceso de la mesa (Authorization: Bearer <codigo>).',
            ], 401);
        }

        // Un token de empleado (Sanctum: "id|secreto") no es un código
        // de mesa: se distingue a los 403, como antes del rediseño.
        if (str_contains($codigo, '|')) {
            return response()->json([
                'message' => 'Solo los clientes pueden acceder.',
            ], 403);
        }

        try {
            $mesa = $this->mesas->accederConCodigo($codigo);
        } catch (ApiException $e) {
            // Código inválido o mesa destruida.
            return response()->json(['message' => $e->getMessage()], 401);
        }

        // El controller evita volver a resolver la mesa.
        $request->attributes->set('cliente_mesa', $mesa);

        return $next($request);
    }
}
