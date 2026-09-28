<?php

namespace App\Http\Controllers;

use App\Services\SesionService;
use Illuminate\Http\Request;

class SesionController extends Controller
{
    public function __construct(private SesionService $sesionService) {}

    /**
     * Login del cliente con código grupal (sin autenticación)
     * POST /api/login-cliente
     * Body: { "codigoGrupal": "1234" }
     */
    public function loginConCodigoGrupal(Request $request)
    {

        $request->validate([
            'codigoGrupal' => 'required|digits:4',
        ]);

        return $this->sesionService->loginConCodigoGrupal(
            $request->codigoGrupal,
        );
    }

    /**
     * Logout del cliente (con autenticación)
     * POST /api/logout
     */
    public function logout(Request $request)
    {
        $sesion = $request->user();
        return $this->sesionService->cerrarSesion($sesion);
    }

    /**
     * Obtener detalles de la sesión actual (con autenticación)
     * GET /api/sesion
     */
    public function detalles(Request $request)
    {
        $sesion = $request->user();
        return $this->sesionService->obtenerDetalles($sesion);
    }
}
