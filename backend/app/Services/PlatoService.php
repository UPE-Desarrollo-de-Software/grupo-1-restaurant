<?php

namespace App\Services;

use App\Models\Plato;
use App\Repositories\PlatoRepository;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

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
            ->map(fn (Plato $plato) => $this->conPromoVigente($plato));
    }

    public function obtenerConIngredientes(int $id): Plato
    {
        return $this->conPromoVigente($this->platos->conIngredientesOrFail((int) $id));
    }

    /** Listado completo (activos e inactivos) para el panel del encargado. */
    public function todos()
    {
        return $this->platos->todos();
    }

    /**
     * @param  array<string, mixed>  $datos
     */
    public function crear(array $datos): Plato
    {
        $archivo = $datos['imagen'] ?? null;
        $ingredientes = $this->normalizarIngredientes($datos['ingredientes'] ?? []);

        $path = $archivo instanceof UploadedFile ? $this->guardarArchivo($archivo) : null;

        unset($datos['ingredientes'], $datos['imagen']);

        if ($path) {
            $datos['imagen'] = $path;
        }

        try {
            $plato = $this->platos->crear($datos);

            $this->platos->sincronizarIngredientes($plato, $ingredientes);
        } catch (\Throwable $e) {

            $this->borrarArchivo($path); // no dejar huérfanos
            throw $e;
        }

        return $plato->load('ingredientes:id,nombre,precioAdicional');
    }

    /**
     * @param  array<string, mixed>  $datos
     */
    public function actualizar(int $id, array $datos): Plato
    {
        $plato = $this->platos->conIngredientesOrFail((int) $id);
        $anterior = $plato->imagen;

        // `ingredientes` omitido o null = no tocar el pivot (el PUT puede
        // ser solo para vincular una promoción); lista, aunque vacía, = reemplazar.
        $reemplazar = array_key_exists('ingredientes', $datos) && is_array($datos['ingredientes']);

        $ingredientes = $this->normalizarIngredientes($reemplazar ? $datos['ingredientes'] : []);

        $archivo = $datos['imagen'] ?? null;
        unset($datos['ingredientes'], $datos['imagen']);

        $path = $archivo instanceof UploadedFile ? $this->guardarArchivo($archivo) : null;

        if ($path) {
            $datos['imagen'] = $path;
        }

        try {
            $plato = $this->platos->actualizar($plato, $datos);

            if ($reemplazar) {
                $this->platos->sincronizarIngredientes($plato, $ingredientes);
            }
        } catch (\Throwable $e) {
            $this->borrarArchivo($path);
            throw $e;
        }

        // Recién con la BD ya actualizada se borra la imagen vieja.
        if ($path) {
            $this->borrarArchivo($anterior);
        }

        return $plato->load('ingredientes:id,nombre,precioAdicional');
    }

    public function eliminar(int $id): void
    {
        $plato = $this->platos->conIngredientesOrFail((int) $id);
        $imagen = $plato->imagen;

        $this->platos->desprenderIngredientes($plato); // Eliminar relaciones con ingredientes
        $this->platos->eliminar($plato);

        // Recién acá, con el plato ya borrado: si la BD rechaza el DELETE
        // la foto tiene que seguir en S3.
        $this->borrarArchivo($imagen);
    }

    /**
     * Ajuste masivo de precios (POST /platos/aumentar-precios).
     *
     * Afecta el catálogo completo del alcance elegido (activos y
     * pausados): es un reprecio, no una baja. Los pedidos existentes
     * NO cambian: `detalle_pedidos.precio_lista` está congelado.
     *
     * Calcula en dos pasos a propósito: `calcular()` devuelve la lista
     * precio_anterior → precio_nuevo SIN persistir (ventana para un
     * preview futuro) y `aplicarAumento()` la guarda en lote.
     *
     * @param  array<string, mixed>  $datos
     * @return list<array{id: int, nombre: string, precio_anterior: float, precio_nuevo: float}>
     */
    public function aumentarPrecios(array $datos): array
    {
        $calculado = $this->calcular($datos);

        $this->aplicarAumento($calculado);

        return $calculado;
    }

    /**
     * Reglas de dominio (lanzan \Exception → 422): exactamente uno de
     * categoria_id / todos, aumento mayor a 0 y alcance con platos.
     *
     * @param  array<string, mixed>  $datos
     * @return list<array{id: int, nombre: string, precio_anterior: float, precio_nuevo: float}>
     */
    private function calcular(array $datos): array
    {
        $categoriaId = isset($datos['categoria_id']) ? (int) $datos['categoria_id'] : null;
        $todos = (bool) ($datos['todos'] ?? false);

        if (($categoriaId !== null) === $todos) {
            throw new \Exception('Elegí una categoría o "todos": tiene que ser exactamente uno de los dos.');
        }

        $valor = (float) $datos['valor'];

        if ($valor <= 0) {
            throw new \Exception('El aumento debe ser mayor a 0.');
        }

        $platos = $this->platos->platosParaAjuste($categoriaId);

        if ($platos->isEmpty()) {
            throw new \Exception('El alcance seleccionado no tiene platos.');
        }

        $esPorcentaje = $datos['tipo'] === 'porcentaje';
        $redondeo = isset($datos['redondeo']) ? (int) $datos['redondeo'] : null;

        return $platos->map(function (Plato $plato) use ($esPorcentaje, $valor, $redondeo) {
            $precioAnterior = (float) $plato->precio;

            $precioNuevo = $esPorcentaje
                ? $precioAnterior * (1 + $valor / 100)
                : $precioAnterior + $valor;

            return [
                'id' => $plato->id,
                'nombre' => $plato->nombre,
                'precio_anterior' => $precioAnterior,
                'precio_nuevo' => $this->redondear($precioNuevo, $redondeo, $precioAnterior),
            ];
        })->values()->all();
    }

    /**
     * Persiste el cálculo en lote (id => precio_nuevo).
     *
     * @param  list<array{id: int, nombre: string, precio_anterior: float, precio_nuevo: float}>  $calculado
     */
    private function aplicarAumento(array $calculado): void
    {
        $precios = [];

        foreach ($calculado as $fila) {
            $precios[$fila['id']] = $fila['precio_nuevo'];
        }

        $this->platos->actualizarPreciosEnLote($precios);
    }

    /**
     * Redondeo a "números lindos" (50/100) o a 2 decimales si no se
     * pidió. El precio nuevo nunca queda en 0 ni baja: si el redondeo
     * se lo comería (o da 0), sube al primer escalón por encima del
     * precio anterior.
     */
    private function redondear(float $precio, ?int $redondeo, float $precioAnterior): float
    {
        if ($redondeo === null) {
            return round(max($precio, $precioAnterior), 2);
        }

        $redondeado = round($precio / $redondeo) * $redondeo;

        if ($redondeado <= $precioAnterior) {
            $redondeado = (floor($precioAnterior / $redondeo) + 1) * $redondeo;
        }

        return max($redondeado, $redondeo);
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

    public function subirImagen(int $id, UploadedFile $archivo): Plato
    {
        $plato = $this->platos->conIngredientesOrFail($id);
        $anterior = $plato->imagen;

        $path = $this->guardarArchivo($archivo);

        try {
            $plato = $this->platos->actualizar($plato, ['imagen' => $path]);
        } catch (\Throwable $e) {
            $this->borrarArchivo($path);
            throw $e;
        }

        $this->borrarArchivo($anterior);

        return $plato;
    }

    public function quitarImagen(int $id): Plato
    {
        $plato = $this->platos->conIngredientesOrFail($id);
        $anterior = $plato->imagen;

        $plato = $this->platos->actualizar($plato, ['imagen' => null]);

        $this->borrarArchivo($anterior);

        return $plato;
    }

    private function guardarArchivo(UploadedFile $archivo): string
    {
        $path = $archivo->store('platos', 's3');

        if ($path === false) {
            throw new \Exception('No se pudo guardar la imagen.');
        }

        // Lo que se persiste en la BD es la URL completa.
        return Storage::disk('s3')->url($path);
    }

    private function borrarArchivo(?string $url): void
    {
        if (! $url) {
            return;
        }

        $base = rtrim(Storage::disk('s3')->url(''), '/').'/';

        // Las URLs que no son de nuestro bucket (las externas viejas) no se tocan.
        if (str_starts_with($url, $base)) {
            Storage::disk('s3')->delete(substr($url, strlen($base)));
        }
    }
}
