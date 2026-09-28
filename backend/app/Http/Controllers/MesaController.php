<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Mesa;
use App\Services\MesaService;

class MesaController extends Controller
{
    public function __construct(private MesaService $service) {}


    public function index()
    {
        $mesa = $this->service->obtenerDisponibles();

        if ($mesa->isEmpty()) {
            $data = [
                'message' => 'No se encontraron Mesas disponibles'
            ];
            return response()->json($data, 200);
        }

        return response()->json($mesa, 200);
    }


    public function create(Request $request)
    {
        $datos = $request->validate([
            'capacidad' => 'required|int',
            'estado' => 'required|enum',
            'qr' => 'string',
        ]);

        $mesa = $this->service->crearMesa($datos);

        return response()->json([
            'message' => 'Mesa Creada exitosamente',
            'mesa' => $mesa
        ], 201);
    }


    public function store(Request $request)
    {
        //
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $mesas = $this->service->obtenerMesas();
        return response()->json([
            'mesas' => $mesas
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(string $id)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $datos = $request->validate([
            'capacidad' => 'required|int',
            'estado' => 'required|enum',
            'qr' => 'string',
        ]);

        $mesa = $this->service->actualizar($id, $datos);

        return response()->json([
            'message' => 'Mesa Actualizada correctamente',
            'Mesa' => $mesa,
        ], 200);
    }


    public function destroy(string $id)
    {
        $this->service->eliminar($id);

        return response()->json([
            'message' => 'Mesa eliminada exitosamente'
        ], 200);
    }
}
