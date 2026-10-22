<?php

namespace App\Services;

use App\Models\Reserva;
use App\Repositories\ConfigMesaRepository;
use App\Repositories\ReservaRepository;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * RESERVA — servicio de dominio (arquitectura hexagonal: capa Service
 * sobre los Repositories Reserva/ConfigMesa).
 *
 * Modelo (decisión del grupo, rebote 3):
 *  - la reserva NO es una mesa: es un HOLD sobre el INVENTARIO del
 *    salón. Se calcula contra `CONFIG_MESA` (potencial) menos las
 *    reservas pendientes cuyo intervalo se solapa con el pedido, y la
 *    combinación elegida se persiste en `reserva_inventario`
 *    (capacidades, no mesas físicas);
 *  - el hold espera al cliente desde la hora reservada hasta
 *    +ESPERA_MIN. Si vence sin que nadie registre la llegada, pasa a
 *    `no_asistio` y se libera solo (vencerVencidas);
 *  - la LLEGADA es `finalizar()`: la reserva muere, el inventario se
 *    libera y el mozo arma las mesas con la combinación que devuelve
 *    `inventario()`. A partir de ahí la mesa se comporta como
 *    cualquier otra (aforo de MesaService, pedidos, destrucción);
 *  - solo las PENDIENTES bloquean inventario (cancelada, finalizada y
 *    no_asistio no cuentan);
 *  - lead time: al menos 2 horas de anticipación;
 *  - transiciones: pendiente → cancelada | finalizada | no_asistio;
 *    la inasistencia exige hora pasada; la llegada no (llegó antes,
 *    llegó).
 *
 * Atómico: `crear()` corre dentro de una transacción y lee las
 * pendientes del día con `lockForUpdate` ANTES de elegir la
 * combinación, así dos altas simultáneas no asignan la misma
 * capacidad (en SQLite de los tests el lock es no-op).
 */
class ReservaService
{
    private const LEAD_TIME_HORAS = 2;

    /**
     * Duración del hold (espera del cliente): [hora, hora + 30 min].
     */
    private const ESPERA_MIN = 30;

    /**
     * Inventario defensivo si CONFIG_MESA está vacía (misma defensa
     * que aplica ConfigMesaRepository::aforo() → 100 = 25 × 4).
     */
    private const INV_DEFECTO = [4 => 25];

    public function __construct(
        private ReservaRepository $reservas,
        private ConfigMesaRepository $configMesas,
    ) {}

    // ==================== CONSULTA ====================

    /**
     * Listado con filtros opcionales (estado, fecha, mesa_id).
     *
     * @return Collection<int, Reserva>
     */
    public function obtenerListado(?string $estado, ?string $fecha, ?int $mesaId): Collection
    {
        return $this->reservas->filtradas($estado, $fecha, $mesaId);
    }

    /**
     * Reserva por id con su inventario; lanza ModelNotFoundException (404).
     */
    public function obtenerPorId(int $id): Reserva
    {
        return $this->reservas->porIdOrFail($id);
    }

    /**
     * Disponibilidad PÚBLICA del horario: qué capacidades quedan
     * libres (en el sentido del hold) para ese intervalo.
     *
     * @return array{fecha: string, inicio: string, fin: string, disponible: list<array{capacidad: int, cantidad: int}>, aforo_disponible: int}
     */
    public function disponibilidad(string $fecha, string $hora): array
    {
        $fecha = Carbon::parse($fecha)->toDateString();
        $hora = Carbon::parse($hora)->format('H:i:s');

        return DB::transaction(function () use ($fecha, $hora) {
            $this->vencerVencidas();

            [$inicio, $fin] = $this->intervalo($hora);
            $disponible = $this->disponiblePorCapacidad($fecha, $inicio, $fin);

            $filas = [];
            foreach ($disponible as $capacidad => $cantidad) {
                $filas[] = ['capacidad' => $capacidad, 'cantidad' => $cantidad];
            }

            return [
                'fecha' => $fecha,
                'inicio' => $this->minutosAHora($inicio),
                'fin' => $this->minutosAHora($fin),
                'disponible' => $filas,
                'aforo_disponible' => (int) array_sum(
                    array_map(fn (array $fila) => $fila['capacidad'] * $fila['cantidad'], $filas)
                ),
            ];
        });
    }

    // ==================== ALTA ====================

    /**
     * Alta de reserva: calcula la combinación de capacidades contra
     * el inventario y guarda el hold. NO crea ni marca mesas.
     *
     * @param  array<string, mixed>  $datos  {contacto_solicitante, fecha, hora, cantPersonas}
     *
     * @throws \Exception lead time o sin inventario para el horario
     */
    public function crear(array $datos): Reserva
    {
        $fecha = Carbon::parse($datos['fecha'])->toDateString();
        $hora = Carbon::parse($datos['hora'])->format('H:i:s');
        $cantPersonas = (int) $datos['cantPersonas'];

        $this->validarLeadTime($fecha, $hora);

        return DB::transaction(function () use ($datos, $fecha, $hora, $cantPersonas) {
            // Primero libera lo vencido (una espera de ayer ya no
            // debería bloquear el inventario de hoy).
            $this->vencerVencidas();

            [$inicio, $fin] = $this->intervalo($hora);
            $disponible = $this->disponiblePorCapacidad($fecha, $inicio, $fin);

            $combinacion = $this->combinar($cantPersonas, $disponible);

            if ($combinacion === []) {
                throw new \Exception(
                    "No hay disponibilidad para {$cantPersonas} personas en ese horario."
                );
            }

            $reserva = $this->reservas->crear([
                // Null explícito para que la clave SIEMPRE aparezca en
                // la respuesta (es legacy y no se llena nunca).
                'mesa_id' => null,
                'contacto_solicitante' => $datos['contacto_solicitante'],
                'fecha' => $fecha,
                'hora' => $hora,
                'cantPersonas' => $cantPersonas,
                'estado' => 'pendiente',
            ]);

            // Persiste la combinación: capacidad => cantidad (una fila
            // por capacidad, unique en la tabla).
            foreach ($this->agrupar($combinacion) as $capacidad => $cantidad) {
                $reserva->inventario()->create([
                    'capacidad' => $capacidad,
                    'cantidad' => $cantidad,
                ]);
            }

            return $reserva->load('inventario');
        });
    }

    // ==================== TRANSICIONES DE ESTADO ====================

    /**
     * pendiente a cancelada (el cliente avisó): el hold se libera.
     */
    public function cancelar(int $id): Reserva
    {
        $reserva = $this->reservas->porIdOrFail($id);
        $this->exigirPendiente($reserva, 'cancelar');

        $reserva->estado = 'cancelada';
        $reserva->save();

        return $reserva->load(['mesa', 'inventario']);
    }

    /**
     * pendiente a finalizada = LLEGADA DEL CLIENTE. Acá muere la
     * reserva: el inventario queda libre y el mozo arma las mesas de
     * `inventario` (que a partir de ahí son mesas comunes).
     *
     * NO exige hora pasada: el cliente puede llegar temprano. Si nadie
     * llega, `vencerVencidas()` la pasa a no_asistio después de la
     * espera.
     */
    public function finalizar(int $id): Reserva
    {
        $reserva = $this->reservas->porIdOrFail($id);
        $this->exigirPendiente($reserva, 'finalizar');

        $reserva->estado = 'finalizada';
        $reserva->save();

        return $reserva->load(['mesa', 'inventario']);
    }

    /**
     * pendiente → no_asistio (pasó la espera y no vino): libera el
     * hold.
     */
    public function marcarNoAsistio(int $id): Reserva
    {
        $reserva = $this->reservas->porIdOrFail($id);
        $this->exigirPendiente($reserva, 'registrar la inasistencia de');
        $this->exigirHoraPasada($reserva);

        $reserva->estado = 'no_asistio';
        $reserva->save();

        return $reserva->load(['mesa', 'inventario']);
    }

    // ==================== INVENTARIO ====================

    /**
     * Vencimiento: toda pendiente cuya espera terminó (fecha y hora
     * pasadas + ESPERA_MIN) pasa a no_asistio y deja de bloquear.
     * Se corre en cada alta y en cada consulta de disponibilidad.
     */
    private function vencerVencidas(): void
    {
        $ahora = Carbon::now();

        foreach ($this->reservas->pendientesHastaFecha($ahora->toDateString()) as $reserva) {
            $fin = Carbon::parse($reserva->fecha.' '.$reserva->hora)
                ->addMinutes(self::ESPERA_MIN);

            if ($ahora->gt($fin)) {
                $reserva->estado = 'no_asistio';
                $reserva->save();
            }
        }
    }

    /**
     * Intervalo del hold en minutos desde 00:00: [inicio, fin).
     * Con reserva a las 21:00 y espera de 30 → [1260, 1290).
     *
     * @return array{0: int, 1: int}
     */
    private function intervalo(string $hora): array
    {
        $inicio = $this->horaAMinutos($hora);

        return [$inicio, $inicio + self::ESPERA_MIN];
    }

    /**
     * Capacidades libres para el intervalo pedido:
     * CONFIG_MESA (agregado por capacidad) − lo que toman las
     * PENDIENTES del día cuyo intervalo [hora, hora+ESPERA) se solapa
     * con el pedido. Solo pendientes: canceladas/finalizadas/
     * no_asistio no bloquean.
     *
     * @return array<int, int> capacidad => cantidad libre (> 0)
     */
    private function disponiblePorCapacidad(string $fecha, int $inicio, int $fin): array
    {
        $disponible = [];

        foreach ($this->configMesas->filas() as $fila) {
            $capacidad = (int) $fila->capacidad;
            $disponible[$capacidad] = ($disponible[$capacidad] ?? 0) + (int) $fila->cantidad;
        }

        if ($disponible === []) {
            $disponible = self::INV_DEFECTO;
        }

        $pendientes = $this->reservas->pendientesDeFecha($fecha);

        foreach ($pendientes as $reserva) {
            if (! $this->solapa($reserva, $inicio, $fin)) {
                continue;
            }

            foreach ($reserva->inventario as $hold) {
                if (isset($disponible[$hold->capacidad])) {
                    $disponible[$hold->capacidad] -= $hold->cantidad;
                }
            }
        }

        $disponible = array_filter($disponible, fn ($cantidad) => $cantidad > 0);
        arsort($disponible);

        return $disponible;
    }

    /**
     * ¿El hold de otra reserva pisa el intervalo pedido? Ambos duran
     * ESPERA_MIN desde su hora: solapan si a < b + ESPERA y
     * b < a + ESPERA (comparación en minutos del mismo día).
     *
     * OJO: si una reserva de ~23:45 cruza la medianoche, las
     * reservas del día siguiente (otra fecha) no se cruzan acá; es un
     * caso borde aceptado (lead time lo vuelve rarísimo).
     */
    private function solapa(Reserva $reserva, int $inicio, int $fin): bool
    {
        $otra = $this->horaAMinutos($reserva->hora);

        return $otra < $fin && $inicio < $otra + self::ESPERA_MIN;
    }

    /**
     * Mejor combinación de mesas para $personas dentro del inventario
     * disponible, por ORDEN DE PRIORIDAD del spec:
     *  1. minimizar el EXCEDENTE (suma − personas);
     *  2. con el mismo excedente, la MENOR cantidad de mesas;
     *  3. empate total → la primera que se encontró (se procesan de
     *     mayor a menor capacidad, así el desempate es determinista
     *     y siempre elige las mesas grandes primero).
     *
     * @param  array<int, int>  $disponible  capacidad => cantidad libre
     * @return list<int> capacidades elegidas (vacío = no hay lugar)
     */
    private function combinar(int $personas, array $disponible): array
    {
        // El inventario expandido: cada mesa individual disponible
        // (respeta los topes por capacidad).
        $mesas = [];
        foreach ($disponible as $capacidad => $cantidad) {
            for ($i = 0; $i < $cantidad; $i++) {
                $mesas[] = $capacidad;
            }
        }

        // Programación dinámica 0/1: suma alcanzable => el camino con
        // MENOS mesas. Cada mesa se usa a lo sumo una vez (se itera
        // sobre el snapshot de antes de agregarla).
        $caminos = [0 => []];
        foreach ($mesas as $capacidad) {
            $anteriores = $caminos;
            foreach ($anteriores as $suma => $camino) {
                $nueva = $suma + $capacidad;
                if (! isset($caminos[$nueva]) || count($camino) + 1 < count($caminos[$nueva])) {
                    $caminos[$nueva] = [...$camino, $capacidad];
                }
            }
        }

        $mejor = null;
        $mejorClave = null;
        foreach ($caminos as $suma => $camino) {
            if ($suma < $personas) {
                continue;
            }

            // [excedente, cantidad de mesas]: comparación por orden lexicográfico.
            $clave = [$suma - $personas, count($camino)];

            if ($mejorClave === null || $clave < $mejorClave) {
                $mejorClave = $clave;
                $mejor = $camino;
            }
        }

        return $mejor ?? [];
    }

    /**
     * Agrupa una combinación en capacidad => cantidad, ordenada de
     * mayor a menor capacidad (para guardar y mostrar).
     *
     * @param  list<int>  $combinacion
     * @return array<int, int>
     */
    private function agrupar(array $combinacion): array
    {
        $agrupado = array_count_values($combinacion);
        arsort($agrupado);

        return $agrupado;
    }

    // ==================== VALIDACIONES ====================

    /**
     * Lead time: desde ahora faltan menos de 2 horas para la reserva.
     *
     * @throws \Exception
     */
    private function validarLeadTime(string $fecha, string $hora): void
    {
        $momentoReserva = Carbon::parse("{$fecha} {$hora}");
        $limite = Carbon::now()->addHours(self::LEAD_TIME_HORAS);

        if ($momentoReserva->lt($limite)) {
            throw new \Exception(
                'La reserva debe hacerse con al menos '
                .self::LEAD_TIME_HORAS
                ." horas de anticipacion (lo mas temprano seria {$limite->format('H:i')})."
            );
        }
    }

    /**
     * @throws \Exception si la reserva no está pendiente
     */
    private function exigirPendiente(Reserva $reserva, string $accion): void
    {
        if ($reserva->estado !== 'pendiente') {
            throw new \Exception(
                "Solo se pueden {$accion} reservas con estado pendiente"
            );
        }
    }

    /**
     * @throws \Exception si aún no llegó la hora de la reserva
     */
    private function exigirHoraPasada(Reserva $reserva): void
    {
        $momentoReserva = Carbon::parse(
            $reserva->fecha.' '.$reserva->hora
        );

        if (Carbon::now()->lt($momentoReserva)) {
            throw new \Exception('Aún no llegó la hora de la reserva');
        }
    }

    // ==================== TIEMPO ====================

    /**
     * 'H:i:s' | 'H:i' → minutos desde 00:00.
     */
    private function horaAMinutos(string $hora): int
    {
        [$horaStr, $minutoStr] = explode(':', $hora);

        return ((int) $horaStr) * 60 + (int) $minutoStr;
    }

    /**
     * Minutos desde 00:00 → 'H:i' (si el hold cruza la medianoche,
     * da vuelta al día siguiente).
     */
    private function minutosAHora(int $minutos): string
    {
        $minutos %= 24 * 60;

        return sprintf('%02d:%02d', intdiv($minutos, 60), $minutos % 60);
    }
}
