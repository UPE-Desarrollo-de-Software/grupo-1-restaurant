<?php

namespace App\Services;

use Carbon\Carbon;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;

/**
 * DISPONIBILIDAD HORARIA DE RESERVAS — fuente ÚNICA del rango de turnos.
 *
 * De acá salen TODOS los horarios del sistema de reservas:
 *  - la grilla del día que consume el front (GET /cliente/reservas/disponibilidad-dia),
 *    compartida por los tres flujos de alta (cliente, gerente y mozo);
 *  - la validación del horario de toda alta (POST /reservas y POST /cliente/reservas);
 *  - la anticipación mínima (lead time), que antes vivía como constante
 *    privada en ReservaService y duplicada a mano en el front.
 *
 * DEFAULT: config/disponibilidad_reservas.php (09:00 a 23:00 cada 30 min,
 * 2 horas de anticipación), con override por variables de entorno.
 *
 * PERSISTENCIA (decisión: NO se toca la base de datos): lo que el gerente
 * guarda se escribe en un JSON dentro de `storage/app/configuracion/`
 * (ver `archivo` en el config). Ciclo de vida real, sin simulaciones:
 *  - sobrevive a un reinicio del contenedor (`docker restart`), porque el
 *    disco del contenedor se conserva;
 *  - se pierde en un redespliegue (rebuild de la imagen), porque el
 *    `storage/` se recrea → vuelve a los valores por defecto;
 *  - NO se guarda en memoria: en mod_php/php-fpm el estado estático muere
 *    al terminar cada request, así que un cambio en memoria no llegaría
 *    ni a la request siguiente.
 *
 * El archivo se lee en cada consulta (sin cache en memoria), así el PUT
 * del gerente se refleja en la respuesta inmediatamente.
 */
class DisponibilidadReservaService
{
    /**
     * Intervalos admitidos entre turnos (minutos). Son los que puede
     * elegir el gerente desde el panel.
     *
     * @var list<int>
     */
    public const INTERVALOS_VALIDOS = [15, 30, 45, 60];

    /**
     * Configuración vigente (archivo del gerente sobre defaults).
     *
     * @return array{hora_inicio: string, hora_fin: string, intervalo_minutos: int, anticipacion_horas: int}
     */
    public function vigente(): array
    {
        $vigente = array_merge($this->porDefecto(), $this->leerArchivo() ?? []);

        // Defensa: un archivo con el rango invertido (o de 0 minutos) no
        // puede romper la grilla ni el alta de reservas.
        if ($this->aMinutos($vigente['hora_fin']) <= $this->aMinutos($vigente['hora_inicio'])) {
            Log::warning('disponibilidad_reservas: rango inválido en el archivo de runtime, se usan los valores por defecto');

            return $this->porDefecto();
        }

        return $vigente;
    }

    /**
     * Configuración vigente + grilla completa de turnos.
     *
     * @return array{hora_inicio: string, hora_fin: string, intervalo_minutos: int, anticipacion_horas: int, slots: list<string>, total_slots: int}
     */
    public function obtener(): array
    {
        $vigente = $this->vigente();
        $slots = $this->horarios();

        return [
            'hora_inicio' => $vigente['hora_inicio'],
            'hora_fin' => $vigente['hora_fin'],
            'intervalo_minutos' => $vigente['intervalo_minutos'],
            'anticipacion_horas' => $vigente['anticipacion_horas'],
            'slots' => $slots,
            'total_slots' => count($slots),
        ];
    }

    /**
     * Resumen de la ventana vigente (sin la grilla). Es el bloque
     * `horarios` que recibe el front junto a los slots del día.
     *
     * @return array{inicio: string, fin: string, intervalo_minutos: int, anticipacion_horas: int}
     */
    public function resumen(): array
    {
        $vigente = $this->vigente();

        return [
            'inicio' => $vigente['hora_inicio'],
            'fin' => $vigente['hora_fin'],
            'intervalo_minutos' => $vigente['intervalo_minutos'],
            'anticipacion_horas' => $vigente['anticipacion_horas'],
        ];
    }

    /**
     * Guarda la ventana elegida por el gerente y devuelve la
     * configuración resultante. No persiste en la base de datos.
     *
     * @param  array<string, mixed>  $datos  {hora_inicio, hora_fin, intervalo_minutos}
     * @return array{hora_inicio: string, hora_fin: string, intervalo_minutos: int, anticipacion_horas: int, slots: list<string>, total_slots: int}
     *
     * @throws \Exception datos inválidos (el controller responde 422)
     */
    public function actualizar(array $datos): array
    {
        $inicio = $this->recortarHora((string) ($datos['hora_inicio'] ?? ''));
        $fin = $this->recortarHora((string) ($datos['hora_fin'] ?? ''));
        $intervalo = (int) ($datos['intervalo_minutos'] ?? 0);

        if (! $this->esHora($inicio)) {
            throw new \Exception('La hora de apertura debe tener el formato HH:MM.');
        }

        if (! $this->esHora($fin)) {
            throw new \Exception('La hora de cierre debe tener el formato HH:MM.');
        }

        if (! in_array($intervalo, self::INTERVALOS_VALIDOS, true)) {
            throw new \Exception('El intervalo entre turnos debe ser 15, 30, 45 o 60 minutos.');
        }

        if ($this->aMinutos($fin) <= $this->aMinutos($inicio)) {
            throw new \Exception('La hora de cierre debe ser posterior a la hora de apertura.');
        }

        $this->guardar([
            'hora_inicio' => $inicio,
            'hora_fin' => $fin,
            'intervalo_minutos' => $intervalo,
        ]);

        return $this->obtener();
    }

    /**
     * Grilla de turnos vigente: de `hora_inicio` a `hora_fin` (ambos
     * inclusive) cada `intervalo_minutos`.
     *
     * @return list<string> 'HH:MM'
     */
    public function horarios(): array
    {
        $vigente = $this->vigente();
        $horarios = [];

        for (
            $minutos = $this->aMinutos($vigente['hora_inicio']);
            $minutos <= $this->aMinutos($vigente['hora_fin']);
            $minutos += $vigente['intervalo_minutos']
        ) {
            $horarios[] = $this->aHora($minutos);
        }

        return $horarios;
    }

    /**
     * Anticipación mínima en horas (hoy 2, configurable por env).
     */
    public function anticipacionHoras(): int
    {
        return $this->vigente()['anticipacion_horas'];
    }

    /**
     * Instante límite del lead time (`ahora + anticipacion_horas`).
     */
    public function limiteAnticipacion(): Carbon
    {
        return Carbon::now()->addHours($this->anticipacionHoras());
    }

    /**
     * Exige que el horario esté dentro de la ventana configurada.
     * Es la validación que comparten el alta del staff y la web, para
     * que no se pueda crear una reserva fuera de la disponibilidad.
     *
     * @throws \Exception horario inválido o fuera de la ventana (422)
     */
    public function exigirHorarioValido(string $hora): void
    {
        $hora = $this->recortarHora($hora);

        if (! $this->esHora($hora)) {
            throw new \Exception('El horario debe tener el formato HH:MM.');
        }

        $vigente = $this->vigente();
        $minutos = $this->aMinutos($hora);

        if ($minutos < $this->aMinutos($vigente['hora_inicio']) || $minutos > $this->aMinutos($vigente['hora_fin'])) {
            throw new \Exception(
                "El horario {$hora} está fuera del horario de reservas configurado ({$vigente['hora_inicio']} a {$vigente['hora_fin']})."
            );
        }
    }

    /**
     * Ruta del archivo de runtime.
     */
    public function ruta(): string
    {
        return (string) config(
            'disponibilidad_reservas.archivo',
            storage_path('app/configuracion/disponibilidad_reservas.json')
        );
    }

    /**
     * Defaults del config, saneados (un env mal escrito no puede dejar
     * al sistema sin grilla).
     *
     * @return array{hora_inicio: string, hora_fin: string, intervalo_minutos: int, anticipacion_horas: int}
     */
    private function porDefecto(): array
    {
        $inicio = $this->recortarHora((string) config('disponibilidad_reservas.hora_inicio', '09:00'));
        $fin = $this->recortarHora((string) config('disponibilidad_reservas.hora_fin', '23:00'));
        $intervalo = (int) config('disponibilidad_reservas.intervalo_minutos', 30);

        return [
            'hora_inicio' => $this->esHora($inicio) ? $inicio : '09:00',
            'hora_fin' => $this->esHora($fin) ? $fin : '23:00',
            'intervalo_minutos' => in_array($intervalo, self::INTERVALOS_VALIDOS, true) ? $intervalo : 30,
            'anticipacion_horas' => max(0, (int) config('disponibilidad_reservas.anticipacion_horas', 2)),
        ];
    }

    /**
     * Lo que el gerente guardó, o null si no hay archivo (o está roto).
     *
     * @return array{hora_inicio?: string, hora_fin?: string, intervalo_minutos?: int}|null
     */
    private function leerArchivo(): ?array
    {
        $ruta = $this->ruta();

        if (! File::exists($ruta)) {
            return null;
        }

        $datos = json_decode((string) File::get($ruta), true);

        if (! is_array($datos)) {
            Log::warning('disponibilidad_reservas: el archivo de runtime no es JSON válido, se usan los valores por defecto', ['ruta' => $ruta]);

            return null;
        }

        $valores = [];

        if (isset($datos['hora_inicio']) && is_string($datos['hora_inicio']) && $this->esHora($datos['hora_inicio'])) {
            $valores['hora_inicio'] = $datos['hora_inicio'];
        }

        if (isset($datos['hora_fin']) && is_string($datos['hora_fin']) && $this->esHora($datos['hora_fin'])) {
            $valores['hora_fin'] = $datos['hora_fin'];
        }

        if (isset($datos['intervalo_minutos']) && in_array((int) $datos['intervalo_minutos'], self::INTERVALOS_VALIDOS, true)) {
            $valores['intervalo_minutos'] = (int) $datos['intervalo_minutos'];
        }

        return $valores === [] ? null : $valores;
    }

    /**
     * Escritura atómica (LOCK_EX) para que dos PUT simultáneos no
     * dejen el archivo a medias.
     *
     * @param  array{hora_inicio: string, hora_fin: string, intervalo_minutos: int}  $valores
     */
    private function guardar(array $valores): void
    {
        $ruta = $this->ruta();

        File::ensureDirectoryExists(dirname($ruta));
        File::put(
            $ruta,
            json_encode($valores, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE).PHP_EOL,
            true
        );
    }

    /**
     * 'HH:MM' (2 dígitos por campo, 00:00 a 23:59).
     */
    private function esHora(string $hora): bool
    {
        return preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $hora) === 1;
    }

    /**
     * 'H:i' | 'H:i:s' | cualquier string → primeros 5 caracteres.
     */
    private function recortarHora(string $hora): string
    {
        return substr(trim($hora), 0, 5);
    }

    /**
     * 'H:i' → minutos desde 00:00.
     */
    private function aMinutos(string $hora): int
    {
        [$horaStr, $minutoStr] = explode(':', $hora);

        return ((int) $horaStr) * 60 + (int) $minutoStr;
    }

    /**
     * Minutos desde 00:00 → 'H:i'.
     */
    private function aHora(int $minutos): string
    {
        return sprintf('%02d:%02d', intdiv($minutos, 60), $minutos % 60);
    }
}
