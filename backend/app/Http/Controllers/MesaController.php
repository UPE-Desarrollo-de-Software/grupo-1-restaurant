<?php

namespace App\Http\Controllers;

use App\Models\Mesa;
use App\UseCases\Mesas\ActualizarMesaUseCase;
use App\UseCases\Mesas\AgruparMesasUseCase;
use App\UseCases\Mesas\CrearMesaUseCase;
use App\UseCases\Mesas\DesagruparMesasUseCase;
use App\UseCases\Mesas\EliminarMesaUseCase;
use App\UseCases\Mesas\ListarMesasDisponiblesUseCase;
use App\UseCases\Mesas\ListarMesasUseCase;
use App\UseCases\Mesas\ObtenerCuentaMesaUseCase;
use App\UseCases\Mesas\ObtenerMesaUseCase;
use App\UseCases\Mesas\ObtenerResumenMesaUseCase;
use App\UseCases\Mesas\OcuparMesaUseCase;
use Illuminate\Http\Request;

/**
 * MESAS (DER v2.2): entidad dinámica con aforo.
 *
 * El código de acceso nace con la mesa y NO se regenera nunca (ni al
 * ocupar ni al agrupar); la destrucción es un borrado lógico, así los
 * pedidos históricos conservan su FK.
 */
class MesaController extends Controller
{
    public function __construct(
        private ListarMesasUseCase $listar,
        private ListarMesasDisponiblesUseCase $listarDisponibles,
        private ObtenerMesaUseCase $obtener,
        private CrearMesaUseCase $crear,
        private ActualizarMesaUseCase $actualizar,
        private EliminarMesaUseCase $eliminar,
        private OcuparMesaUseCase $ocuparMesa,
        private AgruparMesasUseCase $agruparMesas,
        private DesagruparMesasUseCase $desagruparMesas,
        private ObtenerResumenMesaUseCase $obtenerResumen,
        private ObtenerCuentaMesaUseCase $obtenerCuenta,
    ) {}

    public function index()
    {
        $mesas = ($this->listar)();

        if ($mesas->isEmpty()) {
            return response()->json(['message' => 'No se encontraron mesas'], 200);
        }

        return response()->json($mesas, 200);
    }

    public function disponibles()
    {
        return response()->json(($this->listarDisponibles)(), 200);
    }

    /**
     * Alta de mesa dinámica (el mozo o la reserva la crean). Valida el
     * aforo contra CONFIG_MESA (422 si se supera).
     */
    public function store(Request $request)
    {
        $datos = $request->validate([
            'capacidad' => 'required|integer|min:1',
            'estado' => 'nullable|in:libre,ocupada,reservada',
            // Mozo responsable de la mesa (DER: USUARIO "atiende" MESA).
            'usuario_id' => 'nullable|exists:usuarios,id',
        ]);

        try {
            $mesa = ($this->crear)($datos);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'message' => 'Mesa creada exitosamente',
            'mesa' => $mesa,
        ], 201);
    }

    public function show(string $id)
    {
        $mesa = ($this->obtener)((int) $id);

        if (! $mesa) {
            return response()->json(['message' => 'Mesa no encontrada'], 200);
        }

        return response()->json($mesa, 200);
    }

    /**
     * Edición de la mesa. El `codigo_acceso` no viaja en el request:
     * no se puede cambiar (queda fuera en el service igualmente).
     */
    public function update(Request $request, string $id)
    {
        $datos = $request->validate([
            'capacidad' => 'required|integer|min:1',
            'estado' => 'required|in:libre,ocupada,reservada',
            'usuario_id' => 'nullable|exists:usuarios,id',
        ]);

        try {
            $mesa = ($this->actualizar)((int) $id, $datos);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        if (! $mesa) {
            return response()->json(['message' => 'Mesa no encontrada'], 200);
        }

        return response()->json([
            'message' => 'Mesa actualizada correctamente',
            'mesa' => $mesa,
        ], 200);
    }

    /**
     * Destrucción (borrado lógico): la app deja de ver la mesa y su
     * código deja de valer; los pedidos históricos siguen intactos.
     */
    public function destroy(string $id)
    {
        $canceladas = ($this->eliminar)((int) $id);

        if ($canceladas === false) {
            return response()->json(['message' => 'Mesa no encontrada'], 200);
        }

        return response()->json([
            'message' => 'Mesa eliminada exitosamente',
            'reservas_canceladas' => $canceladas,
        ], 200);
    }

    // ==================== SERVICIO DE LA VISITA ====================

    /**
     * POST /api/mesas/{mesa}/ocupar — marca la mesa ocupada. NO
     * regenera el código: el comensal entra siempre con el mismo.
     */
    public function ocupar(Mesa $mesa)
    {
        try {
            $resultado = ($this->ocuparMesa)($mesa->id);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'message' => 'Mesa ocupada. Pasale el codigo al cliente.',
            'mesa' => $resultado['mesa'],
            'codigo_acceso' => $resultado['codigo_acceso'],
        ], 200);
    }

    /**
     * POST /api/mesas/agrupar — agrupa mesas para el resumen conjunto
     * de lectura. Los códigos NO cambian.
     */
    public function agrupar(Request $request)
    {
        $datos = $request->validate([
            'mesa_ids' => 'required|array|min:2',
            'mesa_ids.*' => 'integer|distinct|exists:mesas,id',
        ]);

        try {
            $resultado = ($this->agruparMesas)($datos['mesa_ids']);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'message' => 'Mesas agrupadas.',
            'grupo_codigo' => $resultado['grupo_codigo'],
            'mesas' => $resultado['mesas'],
            'codigos_acceso' => $resultado['codigos'],
        ], 200);
    }

    /**
     * POST /api/mesas/desagrupar — saca las mesas del grupo.
     */
    public function desagrupar(Request $request)
    {
        $datos = $request->validate([
            'mesa_ids' => 'required|array|min:1',
            'mesa_ids.*' => 'integer|distinct|exists:mesas,id',
        ]);

        try {
            $mesas = ($this->desagruparMesas)($datos['mesa_ids']);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'message' => 'Mesas desagrupadas.',
            'mesas' => $mesas,
        ], 200);
    }

    /**
     * GET /api/mesas/{mesa}/pedidos — resumen de lectura: TODOS los
     * pedidos activos de la mesa con sus líneas (varios comensales,
     * varios pedidos). Comparten mozo y comensal.
     */
    public function resumen(Mesa $mesa)
    {
        return response()->json(($this->obtenerResumen)($mesa->id), 200);
    }

    /**
     * GET /api/mesas/{mesa}/cuenta — cuenta dividida en PARTES por
     * pedido raíz, cortada por ocupada_desde. Se resuelve SIN el
     * binding de la ruta: la cuenta sirve aunque la mesa ya se haya
     * destruido (cuenta de la visita terminada). Id inexistente → 404.
     */
    public function cuenta(string $id)
    {
        return response()->json(($this->obtenerCuenta)((int) $id), 200);
    }
}
