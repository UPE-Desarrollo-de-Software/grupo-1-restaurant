<?php

namespace Database\Seeders;

use App\Models\DetallePedido;
use App\Models\Mesa;
use App\Models\Pago;
use App\Models\Pedido;
use App\Models\Plato;
use App\Models\Reserva;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * DATOS DE DEMO para el dashboard de estadísticas, el historial de
 * comandas y la cola de cocina (último paso de DatabaseSeeder o
 * `php artisan db:seed --class=EstadisticasSeeder`).
 *
 * Genera una ventana de `DIAS` días (incluyendo hoy):
 *  - visitas ya cerradas: mesa destruida + 2 pedidos (entregados, con
 *    algunos cancelados) + 1 pago aprobado por visita (efectivo y
 *    Mercado Pago alternados);
 *  - mesas vivas con pedidos activos (ocupación, cola de cocina y hub
 *    del mozo con vida);
 *  - reservas: una pasada, tres de HOY (el bloque `reservas_hoy` del
 *    dashboard) y una futura pendiente.
 *
 * Idempotente: si la base ya tiene pedidos/reservas/mesas NO hace
 * nada, así nunca pisa datos reales. Sólo tiene sentido sobre una
 * base recién seedeada (necesita los platos de PlatoSeeder).
 */
class EstadisticasSeeder extends Seeder
{
    /**
     * Días de historia hacia atrás (incluye hoy): alcanza para los
     * períodos "hoy" y "7d" del dashboard con su comparación.
     */
    private const DIAS = 15;

    /**
     * Visitas cerradas: cada una aporta 2 pedidos y 1 pago.
     */
    private const VISITAS = 7;

    /**
     * Pedidos activos que quedan en las mesas vivas (en_curso,
     * enviado, en_preparacion y listo).
     */
    private const ACTIVOS = 4;

    public function run(): void
    {
        if (Pedido::query()->exists() || Reserva::query()->exists() || Mesa::query()->exists()) {
            $this->command?->warn('EstadisticasSeeder: la base ya tiene pedidos/reservas/mesas; no se genera nada.');

            return;
        }

        $platos = Plato::query()->get();

        if ($platos->isEmpty()) {
            $this->command?->warn('EstadisticasSeeder: no hay platos; corré primero el seed base.');

            return;
        }

        DB::transaction(function () use ($platos): void {
            $this->visitasCerradas($platos);
            $this->mesasVivas($platos);
            $this->reservas();
        });

        $this->command?->info(sprintf(
            'EstadisticasSeeder: %d pedidos, %d pagos y 5 reservas en los últimos %d días.',
            self::VISITAS * 2 + self::ACTIVOS,
            self::VISITAS,
            self::DIAS,
        ));
    }

    /**
     * Visitas históricas repartidas en la ventana: mesa + 2 pedidos +
     * 1 pago aprobado, y al final la mesa se destruye (como al cerrar
     * la visita real).
     *
     * @param  Collection<int, Plato>  $platos
     */
    private function visitasCerradas(Collection $platos): void
    {
        // Offset de cada visita en la ventana, de 0 (hoy) a DIAS-1.
        $offsets = [];

        for ($i = 0; $i < self::VISITAS; $i++) {
            $offsets[] = (int) round($i * (self::DIAS - 1) / max(self::VISITAS - 1, 1));
        }

        foreach ($offsets as $indice => $diasAtras) {
            $mesa = $this->crearMesa('ocupada');

            // Hora creíble de servicio: almuerzo o cena.
            $base = now()->subDays($diasAtras)->setTime(
                fake()->randomElement([12, 13, 14, 20, 21]),
                fake()->numberBetween(0, 59),
            );

            // La 2da comanda de las últimas 3 visitas queda cancelada:
            // 11 entregados + 3 cancelados en total.
            $cancelaSegundo = $indice >= self::VISITAS - 3;
            $cobrado = 0.0;

            for ($n = 0; $n < 2; $n++) {
                $estado = $n === 1 && $cancelaSegundo ? 'cancelado' : 'entregado';
                $fecha = $base->copy()->addMinutes($n === 0 ? 0 : fake()->numberBetween(45, 90));
                $pedido = $this->crearPedido($mesa, $estado, $platos, $fecha, true);

                // Lo cancelado no se cobra (la cuenta de la visita
                // excluye los pedidos cancelados).
                if ($estado === 'entregado') {
                    $cobrado += (float) $pedido->total;
                }
            }

            $this->crearPago($mesa, $cobrado, $base, $indice);

            // Visita cerrada: la mesa se destruye (borrado lógico).
            $mesa->destruir();
        }
    }

    /**
     * Mesas vivas para ocupación, cola de cocina y hub del mozo: dos
     * ocupadas con los pedidos activos y una libre (para que el
     * dashboard muestre ambos contadores).
     *
     * @param  Collection<int, Plato>  $platos
     */
    private function mesasVivas(Collection $platos): void
    {
        // Auto-pedido sin confirmar (el gate de confirmación queda
        // demoable) + una comanda que ya salió a cocina.
        $ocupadaA = $this->crearMesa('ocupada');
        $this->crearPedido($ocupadaA, 'en_curso', $platos, $this->haceUnRato(30), false);
        $this->crearPedido($ocupadaA, 'enviado', $platos, $this->haceUnRato(75), true);

        // Otra visita en curso: comanda en preparación y otra lista.
        $ocupadaB = $this->crearMesa('ocupada');
        $this->crearPedido($ocupadaB, 'en_preparacion', $platos, $this->haceUnRato(50), true);
        $this->crearPedido($ocupadaB, 'listo', $platos, $this->haceUnRato(20), true);

        $this->crearMesa('libre');
    }

    /**
     * Reservas: una pasada, tres de HOY (para `reservas_hoy` del
     * dashboard: pendiente, finalizada y cancelada) y una futura.
     */
    private function reservas(): void
    {
        $datos = [
            ['dias' => -5, 'hora' => '20:00:00', 'estado' => 'no_asistio', 'personas' => 4],
            ['dias' => 0, 'hora' => '13:00:00', 'estado' => 'pendiente', 'personas' => 3],
            ['dias' => 0, 'hora' => '13:30:00', 'estado' => 'finalizada', 'personas' => 2],
            ['dias' => 0, 'hora' => '21:00:00', 'estado' => 'cancelada', 'personas' => 5],
            ['dias' => 1, 'hora' => '20:30:00', 'estado' => 'pendiente', 'personas' => 4],
        ];

        foreach ($datos as $fila) {
            Reserva::create([
                'mesa_id' => null,
                'codigo' => str_pad((string) fake()->unique()->numberBetween(0, 999999), 6, '0', STR_PAD_LEFT),
                'contacto_solicitante' => fake()->phoneNumber(),
                'fecha' => now()->addDays($fila['dias'])->toDateString(),
                'hora' => $fila['hora'],
                'cantPersonas' => $fila['personas'],
                'estado' => $fila['estado'],
            ]);
        }
    }

    /**
     * Mesa con código de 6 dígitos único (misma regla que
     * MesaService/MesaFactory: string, los ceros importan).
     */
    private function crearMesa(string $estado): Mesa
    {
        return Mesa::create([
            'usuario_id' => null,
            'codigo_acceso' => str_pad((string) fake()->unique()->numberBetween(0, 999999), 6, '0', STR_PAD_LEFT),
            'capacidad' => 4,
            'estado' => $estado,
        ]);
    }

    /**
     * Pedido con 1 a 3 líneas al azar del menú real. El total sale de
     * la suma de sus subtotales (misma fórmula que PedidoService).
     *
     * @param  Collection<int, Plato>  $platos
     */
    private function crearPedido(
        Mesa $mesa,
        string $estado,
        Collection $platos,
        Carbon $fecha,
        bool $lineasConfirmadas,
    ): Pedido {
        $lineas = [];
        $total = 0.0;

        $cantidadLineas = fake()->numberBetween(1, min(3, $platos->count()));

        foreach (fake()->randomElements($platos->all(), $cantidadLineas) as $plato) {
            $cantidad = fake()->numberBetween(1, 2);
            $subtotal = round($cantidad * (float) $plato->precio, 2);

            $lineas[] = [
                'plato_id' => $plato->id,
                'cantidad' => $cantidad,
                'precio_lista' => $plato->precio,
                'subtotal' => $subtotal,
                'confirmado' => $lineasConfirmadas,
            ];

            $total += $subtotal;
        }

        $pedido = Pedido::create([
            'mesa_id' => $mesa->id,
            'pedido_padre_id' => null,
            'estado' => $estado,
            'total' => round($total, 2),
            'fecha' => $fecha->format('Y-m-d H:i:s'),
        ]);

        foreach ($lineas as $linea) {
            DetallePedido::create($linea + ['pedido_id' => $pedido->id]);
        }

        return $pedido;
    }

    /**
     * Pago aprobado de la visita (tipo total) por el importe de lo
     * entregado, un hora después del primer pedido. El medio alterna
     * por visita para que el dashboard muestre efectivo y MP.
     */
    private function crearPago(Mesa $mesa, float $monto, Carbon $momento, int $indice): void
    {
        $medio = $indice % 2 === 0 ? Pago::MEDIO_EFECTIVO : Pago::MEDIO_MERCADO_PAGO;
        $esMp = $medio === Pago::MEDIO_MERCADO_PAGO;

        Pago::create([
            'mesa_id' => $mesa->id,
            'pedido_id' => null,
            'tipo' => Pago::TIPO_TOTAL,
            'monto' => round($monto, 2),
            'estado' => Pago::ESTADO_APROBADO,
            'medio_pago' => $medio,
            // Referencias fake (no existen en Mercado Pago): sólo
            // ocupan los campos UNIQUE de la fila.
            'mp_preference_id' => $esMp ? 'seed-pref-'.($indice + 1) : null,
            'mp_payment_id' => $esMp ? 'seed-pago-'.($indice + 1) : null,
            'fecha' => $momento->copy()->addHour()->format('Y-m-d H:i:s'),
        ]);
    }

    /**
     * Momento reciente de HOY: el período "hoy" del dashboard debe
     * incluir los pedidos activos aunque el seed corra de madrugada.
     */
    private function haceUnRato(int $minutos): Carbon
    {
        $momento = now()->subMinutes($minutos);

        return $momento->isSameDay(now()) ? $momento : now()->startOfDay()->addHours(12);
    }
}
