<?php

namespace App\Http\Controllers;

use App\UseCases\Promociones\ActualizarPromocionUseCase;
use App\UseCases\Promociones\CrearPromocionUseCase;
use App\UseCases\Promociones\EliminarPromocionUseCase;
use App\UseCases\Promociones\ListarPromocionUseCase;
use App\UseCases\Promociones\ObtenerPromocionUseCase;
use Illuminate\Http\Request;

/**
 * PROMOCIONES del catálogo (DER v2.2).
 *
 * El alcance de cada promo vive en platos.promocion_id (el CRUD del
 * plato lo setea); acá solo se administra la promo en sí. Las reglas
 * de negocio (topes por tipo, ventana de fechas, no borrar una promo
 * ya aplicada) están en PromocionService y salen como 422.
 */
class PromocionController extends Controller
{
    public function __construct(
        private ListarPromocionUseCase $listar,
        private ObtenerPromocionUseCase $obtener,
        private CrearPromocionUseCase $crear,
        private ActualizarPromocionUseCase $actualizar,
        private EliminarPromocionUseCase $eliminar,
    ) {}

    public function index()
    {
        $promociones = ($this->listar)();

        if ($promociones->isEmpty()) {
            return response()->json(['message' => 'No se encontraron promociones'], 200);
        }

        return response()->json($promociones, 200);
    }

    public function show(int $id)
    {
        $promocion = ($this->obtener)($id);

        if (! $promocion) {
            return response()->json(['message' => 'No se encontraron promociones'], 200);
        }

        return response()->json($promocion, 200);
    }

    public function store(Request $request)
    {
        $datos = $request->validate([
            'nombre' => 'required|string|max:255',
            'tipo' => 'required|in:porcentaje,monto_fijo,precio_fijo,2x1',
            // Los topes por tipo (porcentaje 1-100, no negativos, 2x1
            // sin valor) los valida el Service → 422.
            'valor' => 'nullable|numeric|min:0',
            'fecha_inicio' => 'nullable|date',
            'fecha_fin' => 'nullable|date|after_or_equal:fecha_inicio',
            'activo' => 'nullable|boolean',
        ]);

        try {
            $promocion = ($this->crear)($datos);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'message' => 'Promocion creada exitosamente',
            'promocion' => $promocion,
        ], 201);
    }

    public function update(Request $request, int $id)
    {
        $datos = $request->validate([
            'nombre' => 'required|string|max:255',
            'tipo' => 'required|in:porcentaje,monto_fijo,precio_fijo,2x1',
            'valor' => 'nullable|numeric|min:0',
            'fecha_inicio' => 'nullable|date',
            'fecha_fin' => 'nullable|date|after_or_equal:fecha_inicio',
            'activo' => 'required|boolean',
        ]);

        try {
            $promocion = ($this->actualizar)($id, $datos);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        if (! $promocion) {
            return response()->json(['message' => 'No se encontraron promociones'], 200);
        }

        return response()->json([
            'message' => 'Promocion actualizada exitosamente',
            'promocion' => $promocion,
        ], 200);
    }

    public function destroy(int $id)
    {
        try {
            $eliminado = ($this->eliminar)($id);
        } catch (\Exception $e) {
            // Regla de negocio: no se puede borrar una promo ya
            // aplicada en pedidos (pierde la referencia histórica).
            return response()->json(['message' => $e->getMessage()], 422);
        }

        if (! $eliminado) {
            return response()->json(['message' => 'No se encontraron promociones'], 200);
        }

        return response()->json([
            'message' => 'Promocion eliminada exitosamente',
        ], 200);
    }
}
