<?php

namespace App\Services;

use App\Models\Plato;
use App\Repositories\PlatoRepository;


/**
 * CRUD de platos (DER v2.2: entidad PLATO; antes "Producto").
 *
 * El plato se asocia a sus ingredientes por `plato_ingrediente`, que
 * además lleva los flags `opcional` / `por_defecto` del DER. La
 * normalización de esa lista es lógica de dominio (queda acá); el
 * sync sobre el pivot es persistencia (PlatoRepository).
 */
class PlatoService
{
    public function __construct(
        private PlatoRepository $platos,
        private PromocionService $promociones
    ) {}

    public function obtenerDisponibles()
    {
        return $this->platos->disponiblesConCategoria()
            ->map(fn(Plato $plato) => $this->conPromoVigente($plato));
    }

    public function obtenerConIngredientes($id): Plato
    {
        return $this->conPromoVigente($this->platos->conIngredientesOrFail((int) $id));
    }

    public function todos()
    {
        return $this->todos();
    }

    /**
     * @param  array<string, mixed>  $datos
     */
    public function crear(array $datos): Plato
    {
        $ingredientes = $this->normalizarIngredientes($datos['ingredientes'] ?? []);

        unset($datos['ingredientes']);

        $plato = $this->platos->crear($datos);

        $this->platos->sincronizarIngredientes($plato, $ingredientes);

        return $plato->load('ingredientes:id,nombre,precioAdicional');
    }

    /**
     * @param  array<string, mixed>  $datos
     */
    public function actualizar($id, array $datos): Plato
    {
        $plato = $this->platos->conIngredientesOrFail((int) $id);

        // `ingredientes` omitido o null = no tocar el pivot (el PUT puede
        // ser solo para vincular una promoción); lista, aunque vacía, = reemplazar.
        $reemplazar = array_key_exists('ingredientes', $datos) && is_array($datos['ingredientes']);

        $ingredientes = $this->normalizarIngredientes($reemplazar ? $datos['ingredientes'] : []);

        unset($datos['ingredientes']);

        $plato = $this->platos->actualizar($plato, $datos);

        if ($reemplazar) {
            $this->platos->sincronizarIngredientes($plato, $ingredientes);
        }

        return $plato->load('ingredientes:id,nombre,precioAdicional');
    }

    public function eliminar($id): void
    {
        $plato = $this->platos->conIngredientesOrFail((int) $id);

        $this->platos->desprenderIngredientes($plato); // Eliminar relaciones con ingredientes
        $this->platos->eliminar($plato);
    }

    /**
     * Acepta la lista de la API: puede venir como ids sueltos
     * (`[1, 2]`) o como objetos con los flags del DER
     * (`[{ingrediente_id: 1, opcional: false, por_defecto: true}]`).
     * Sin flags, los defaults del pivot son opcional=true y
     * por_defecto=true.
     *
     * @param  array<mixed>  $ingredientes
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

    /** La carta solo muestra ofertas vigentes: el resto, promocion = null. */
    private function conPromoVigente(Plato $plato): Plato
    {
        if ($plato->promocion && ! $this->promociones->vigente($plato->promocion)) {
            $plato->setRelation('promocion', null);
        }

        return $plato;
    }
}
