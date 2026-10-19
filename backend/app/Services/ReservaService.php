<?php

namespace App\Services;

use App\Models\Mesa;
use App\Models\Reserva;
use App\Repositories\MesaRepository;
use App\Repositories\ReservaRepository;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * RESERVA — servicio de dominio (arquitectura hexagonal: capa Service
 * sobre los Repositories Reserva/Mesa).
 *
 * Reglas (DER v3.0 + decisiones del grupo):
 *  - la mesa de la reserva SIEMPRE existe: o el empleado la elige
 *    (find estricto) o, en la reserva pública sin mesa, el SISTEMA la
 *    crea como "mozo virtual" validando el aforo (nunca el cliente
 *    inserta mesas por su cuenta);
 *  - lead time: la reserva debe hacerse con al menos 2 horas de
 *    anticipación (siendo las 19:00 lo más temprano es 21:00);
 *  - conflicto: misma mesa + fecha + hora EXACTA con estado pendiente;
 *  - `cantPersonas` ≤ capacidad de la mesa;
 *  - el estado de la mesa ('reservada') solo cambia con reservas de
 *    HOY; las de otros días se consultan con GET /reservas?fecha=...;
 *  - transiciones: pendiente → cancelada | finalizada | no_asistio;
 *    finalizar e inasistir exigen que ya haya pasado la hora.
 */
class ReservaService
{
    private const LEAD_TIME_HORAS = 2;

    public function __construct(
        private ReservaRepository $reservas,
        private MesaRepository $mesas,
        private MesaService $mesaService,
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
     * Reserva por id con su mesa; lanza ModelNotFoundException (404).
     */
    public function obtenerPorId(int $id): Reserva
    {
        return $this->reservas->porIdOrFail($id);
    }

    // ==================== ALTA ====================

    /**
     * Alta de reserva.
     *
     * @param  array<string, mixed>  $datos  {mesa_id?, contacto_solicitante, fecha, hora, cantPersonas}
     * @param  bool  $esPublico  true = reserva del cliente web (puede
     *                           venir sin mesa_id: la crea el "mozo
     *                           virtual"); false = la toma el mozo y
     *                           la mesa es obligatoria.
     *
     * @throws \Exception lead time, capacidad o conflicto horario
     * @throws ModelNotFoundException mesa inexistente
     */
    public function crear(array $datos, bool $esPublico): Reserva
    {
        $fecha = Carbon::parse($datos['fecha'])->toDateString();
        $hora = Carbon::parse($datos['hora'])->format('H:i:s');
        $cantPersonas = (int) $datos['cantPersonas'];

        $this->validarLeadTime($fecha, $hora);

        return DB::transaction(function () use ($datos, $esPublico, $fecha, $hora, $cantPersonas) {
            if (isset($datos['mesa_id'])) {
                // Find ERICTO: jamás find-or-create. El cliente no
                // puede crear mesas escribiendo un id inventado.
                $mesa = $this->mesas->porIdOrFail((int) $datos['mesa_id']);

                if ($cantPersonas > (int) $mesa->capacidad) {
                    throw new \Exception('La cantidad de personas supera capacidad de mesa');
                }

                $this->validarConflicto($mesa, $fecha, $hora);
            } else {
                if (! $esPublico) {
                    throw new \Exception('El empleado debe indicar la mesa a reservar.');
                }

                // Mozo virtual: la mesa la crea el SISTEMA con las
                // mismas reglas de aforo que usa el mozo (la mesa es
                // nueva, así que no puede tener conflicto horario).
                $mesa = $this->mesaService->crearMesa([
                    'capacidad' => $cantPersonas,
                    'usuario_id' => null,
                ]);
            }

            $reserva = $this->reservas->crear([
                'mesa_id' => $mesa->id,
                'contacto_solicitante' => $datos['contacto_solicitante'],
                'fecha' => $fecha,
                'hora' => $hora,
                'cantPersonas' => $cantPersonas,
                'estado' => 'pendiente',
            ]);

            // Solo las reservas de HOY marcan la mesa; las de otros
            // días no tocan el estado (se consultan por fecha).
            if ($this->esDeHoy($fecha)) {
                $mesa->Reservar();
            }

            return $reserva->load('mesa');
        });
    }

    // ==================== TRANSICIONES DE ESTADO ====================

    /**
     * pendiente a cancelada.
     */
    public function cancelar(int $id): Reserva
    {
        $reserva = $this->reservas->porIdOrFail($id);
        $this->exigirPendiente($reserva, 'cancelar');

        $reserva->estado = 'cancelada';
        $reserva->save();

        $this->liberarMesaSiCorresponde($reserva);

        return $reserva->load('mesa');
    }

    /**
     * pendiente a finalizada (el evento ya ocurrió).
     */
    public function finalizar(int $id): Reserva
    {
        $reserva = $this->reservas->porIdOrFail($id);
        $this->exigirPendiente($reserva, 'finalizar');
        $this->exigirHoraPasada($reserva);

        $reserva->estado = 'finalizada';
        $reserva->save();

        $this->liberarMesaSiCorresponde($reserva);

        return $reserva->load('mesa');
    }

    /**
     * pendiente → no_asistio (el cliente no vino).
     */
    public function marcarNoAsistio(int $id): Reserva
    {
        $reserva = $this->reservas->porIdOrFail($id);
        $this->exigirPendiente($reserva, 'registrar la inasistencia de');
        $this->exigirHoraPasada($reserva);

        $reserva->estado = 'no_asistio';
        $reserva->save();

        $this->liberarMesaSiCorresponde($reserva);

        return $reserva->load('mesa');
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
     * Misma mesa + fecha + hora exacta + estado pendiente.
     *
     * @throws \Exception
     */
    private function validarConflicto(Mesa $mesa, string $fecha, string $hora): void
    {
        if ($this->reservas->existeConflicto($mesa->id, $fecha, $hora)) {
            throw new \Exception('Hay una reserva agendada en esa misma fecha y hora');
        }
    }

    // ==================== ESTADO DE LA MESA ====================

    /**
     * Al cerrar una reserva (cancelar/finalizar/no_asistio): si era de
     * HOY y la mesa quedó solo por esa reserva, vuelve a 'libre'.
     */
    private function liberarMesaSiCorresponde(Reserva $reserva): void
    {
        if (! $this->esDeHoy($reserva->fecha)) {
            return;
        }

        $mesa = $this->mesas->porId((int) $reserva->mesa_id);

        if (! $mesa || $mesa->estado !== 'reservada') {
            return;
        }

        if ($this->reservas->hayPendienteEnFecha($mesa->id, $reserva->fecha)) {
            return;
        }

        $mesa->expirarReserva();
    }

    private function esDeHoy(string $fecha): bool
    {
        return $fecha === Carbon::today()->toDateString();
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
}
