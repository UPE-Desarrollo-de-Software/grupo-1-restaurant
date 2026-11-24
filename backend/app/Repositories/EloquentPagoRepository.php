<?php

namespace App\Repositories;

use App\Models\Pago;
use Illuminate\Support\Collection;

class EloquentPagoRepository implements PagoRepository
{
    public function crear(array $datos): Pago
    {
        return Pago::create($datos);
    }

    public function porId(int $id): ?Pago
    {
        return Pago::find($id);
    }

    public function porPreferenceId(string $mpPreferenceId): ?Pago
    {
        return Pago::where('mp_preference_id', $mpPreferenceId)->first();
    }

    public function porMpPaymentId(string $mpPaymentId): ?Pago
    {
        return Pago::where('mp_payment_id', $mpPaymentId)->first();
    }

    public function aprobadosDeMesa(int $mesaId): Collection
    {
        // Orden cronológico: PagoService::saldo() reparte los pagos
        // entre las partes siguiendo ese orden.
        return Pago::where('mesa_id', $mesaId)
            ->where('estado', Pago::ESTADO_APROBADO)
            ->orderBy('fecha')
            ->orderBy('id')
            ->get();
    }

    public function aprobadosDePedido(int $pedidoId): Collection
    {
        return Pago::where('pedido_id', $pedidoId)
            ->where('estado', Pago::ESTADO_APROBADO)
            ->get();
    }

    public function deMesa(int $mesaId): Collection
    {
        return Pago::where('mesa_id', $mesaId)
            ->orderBy('fecha')
            ->orderBy('id')
            ->get();
    }

    public function aprobadosEntre(string $desde, string $hasta): array
    {
        return Pago::query()
            ->where('estado', Pago::ESTADO_APROBADO)
            ->whereBetween('fecha', ["{$desde} 00:00:00", "{$hasta} 23:59:59"])
            ->selectRaw('medio_pago, count(*) as cantidad, coalesce(sum(monto), 0) as total')
            ->groupBy('medio_pago')
            ->get()
            ->mapWithKeys(fn (Pago $fila) => [
                (string) $fila->medio_pago => [
                    'cantidad' => (int) $fila->cantidad,
                    'total' => round((float) $fila->total, 2),
                ],
            ])
            ->all();
    }
}
