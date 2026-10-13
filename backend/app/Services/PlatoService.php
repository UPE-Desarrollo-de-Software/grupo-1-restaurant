<?php

namespace App\Services;

use App\Models\Plato;

/**
 * CRUD de platos (DER v2.1: entidad PLATO; antes "Producto").
 *
 * El plato se asocia a sus ingredientes por `plato_ingrediente`, que
 * además lleva los flags `opcional` / `por_defecto` del DER.
 */
class PlatoService
{
    public function obtenerDisponibles()
    {
        return Plato::join('categorias', 'platos.categoria_id', '=', 'categorias.id')
            ->where('platos.disponible', true)
            ->select(
                'categorias.nombre as categoria_nombre',
                'platos.id',
                'platos.categoria_id',
                'platos.promocion_id',
                'platos.nombre',
                'platos.descripcion',
                'platos.precio',
                'platos.imagen',
                'platos.disponible'
            )
            ->get();
    }

    public function obtenerConIngredientes($id)
    {
        return Plato::with('ingredientes:id,nombre,precioAdicional')
            ->findOrFail($id);
    }

    public function crear(array $datos)
    {
        $ingredientes = $this->normalizarIngredientes($datos['ingredientes'] ?? []);

        unset($datos['ingredientes']);

        $plato = Plato::create($datos);

        $plato->ingredientes()->sync($ingredientes);

        return $plato->load('ingredientes:id,nombre,precioAdicional');
    }

    public function actualizar($id, array $datos)
    {
        $plato = Plato::findOrFail($id);

        $ingredientes = $this->normalizarIngredientes($datos['ingredientes'] ?? []);

        unset($datos['ingredientes']);

        $plato->update($datos);

        $plato->ingredientes()->sync($ingredientes);

        return $plato->load('ingredientes:id,nombre,precioAdicional');
    }

    public function eliminar($id)
    {
        $plato = Plato::findOrFail($id);
        $plato->ingredientes()->detach(); // Eliminar relaciones con ingredientes
        $plato->delete();
    }

    /**
     * Acepta la lista de la API: puede venir como ids sueltos
     * (`[1, 2]`) o como objetos con los flags del DER
     * (`[{ingrediente_id: 1, opcional: false, por_defecto: true}]`).
     * Sin flags, los defaults del pivot son opcional=true y
     * por_defecto=true.
     *
     * @return array<int, array{opcional: bool, por_defecto: bool}>
     */
    private function normalizarIngredientes(array $ingredientes): array
    {
        $filas = [];

        foreach ($ingredientes as $item) {
            if (is_array($item)) {
                $filas[(int) $item['ingrediente_id']] = [
                    'opcional' => (bool) ($item['opcional'] ?? true),
                    'por_defecto' => (bool) ($item['por_defecto'] ?? true),
                ];

                continue;
            }

            $filas[(int) $item] = [
                'opcional' => true,
                'por_defecto' => true,
            ];
        }

        return $filas;
    }
}
