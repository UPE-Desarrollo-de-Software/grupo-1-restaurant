<?php

namespace App\Http\Controllers;

use App\UseCases\Platos\ActualizarPlatoUseCase;
use App\UseCases\Platos\AumentarPreciosPlatosUseCase;
use App\UseCases\Platos\CrearPlatoUseCase;
use App\UseCases\Platos\EliminarPlatoUseCase;
use App\UseCases\Platos\ListarPlatosActivosUseCase;
use App\UseCases\Platos\ListarPlatosUseCase;
use App\UseCases\Platos\ObtenerPlatoUseCase;
use App\UseCases\Platos\QuitarImagenPlatoUseCase;
use App\UseCases\Platos\SubirImagenPlatoUseCase;
use Illuminate\Http\Request;

/**
 * PLATO (antes "productos", rutas /api/productos).
 */
class PlatoController extends Controller
{
    public function __construct(
        private ListarPlatosUseCase $listar,
        private ListarPlatosActivosUseCase $listarActivos,
        private ObtenerPlatoUseCase $obtener,
        private CrearPlatoUseCase $crear,
        private ActualizarPlatoUseCase $actualizar,
        private EliminarPlatoUseCase $eliminar,
        private AumentarPreciosPlatosUseCase $aumentarPrecios,
        private SubirImagenPlatoUseCase $subirImagen,
        private QuitarImagenPlatoUseCase $quitarImagen
    ) {}

    public function indexAll()
    {
        $platos = ($this->listar)();

        if ($platos->isEmpty()) {
            return response()->json(['message' => 'No se encontraron platos'], 200);
        }

        return response()->json($platos, 200);
    }

    public function index()
    {
        $platos = ($this->listarActivos)();

        if ($platos->isEmpty()) {
            return response()->json(['message' => 'No se encontraron platos'], 200);
        }

        return response()->json($platos, 200);
    }

    public function show(int $id)
    {
        $plato = ($this->obtener)($id);

        if (! $plato) {
            return response()->json(['message' => 'No se encontraron platos'], 200);
        }

        return response()->json($plato, 200);
    }

    public function store(Request $request)
    {
        $datos = $request->validate([
            'categoria_id' => 'required|exists:categorias,id',
            // Oferta vigente en la carta (FK opcional del DER).
            'promocion_id' => 'nullable|exists:promociones,id',
            'nombre' => 'required|string|max:255',
            'descripcion' => 'nullable|string',
            'precio' => 'required|numeric|min:0',
            'disponible' => 'required|boolean',

            // Ingredientes del plato con los flags opcional/por_defecto.
            'ingredientes' => 'nullable|array',
            'ingredientes.*' => 'array',
            'ingredientes.*.ingrediente_id' => 'required|integer|exists:ingredientes,id',
            'ingredientes.*.opcional' => 'nullable|boolean',
            'ingredientes.*.por_defecto' => 'nullable|boolean',
        ]);

        $plato = ($this->crear)($datos);

        return response()->json([
            'message' => 'Plato creado exitosamente',
            'plato' => $plato,
        ], 201);
    }

    public function update(Request $request, int $id)
    {
        $datos = $request->validate([
            'categoria_id' => 'required|exists:categorias,id',
            'promocion_id' => 'nullable|exists:promociones,id',
            'nombre' => 'required|string|max:255',
            'descripcion' => 'nullable|string',
            'precio' => 'required|numeric|min:0',
            'disponible' => 'required|boolean',
            'ingredientes' => 'nullable|array',
            'ingredientes.*' => 'array',
            'ingredientes.*.ingrediente_id' => 'required|integer|exists:ingredientes,id',
            'ingredientes.*.opcional' => 'nullable|boolean',
            'ingredientes.*.por_defecto' => 'nullable|boolean',
        ]);

        $plato = ($this->actualizar)($id, $datos);

        if (! $plato) {
            return response()->json(['message' => 'No se encontraron platos'], 200);
        }

        return response()->json([
            'message' => 'Plato actualizado exitosamente',
            'plato' => $plato,
        ], 200);
    }

    public function destroy(int $id)
    {
        $eliminado = ($this->eliminar)($id);

        if (! $eliminado) {
            return response()->json(['message' => 'No se encontraron platos'], 200);
        }

        return response()->json([
            'message' => 'Plato eliminado exitosamente',
        ], 200);
    }

    public function imagen(Request $request, int $id)
    {
        $request->validate([
            'imagen' => 'required|image|mimes:jpg,jpeg,png,webp|max:2048', // KB
        ]);

        try {
            $plato = ($this->subirImagen)($id, $request->file('imagen'));
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 404);
        }

        return response()->json([
            'message' => 'Imagen actualizada exitosamente',
            'plato' => $plato,
        ], 200);
    }

    public function quitarImagen(int $id)
    {
        $plato = ($this->quitarImagen)($id);

        return response()->json([
            'message' => 'Imagen eliminada exitosamente',
            'plato' => $plato,
        ], 200);
    }

    public function aumentarPrecios(Request $request)
    {
        $datos = $request->validate([
            'todos' => 'nullable|boolean',
            'categoria_id' => 'nullable|integer|exists:categorias,id',
            'tipo' => 'required|in:porcentaje,monto',
            'valor' => 'required|numeric|min:0',
            'redondeo' => 'nullable|in:50,100',
        ]);

        try {
            $actualizados = ($this->aumentarPrecios)($datos);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'message' => 'Se actualizaron ' . count($actualizados) . ' platos',
            'total' => count($actualizados),
            'actualizados' => array_map(fn($p) => [
                'id' => $p['id'],
                'nombre' => $p['nombre'],
                'precio_anterior' => $p['precio_anterior'],
                'precio_nuevo' => $p['precio_nuevo'],
            ], $actualizados),
        ], 200);
    }
}
