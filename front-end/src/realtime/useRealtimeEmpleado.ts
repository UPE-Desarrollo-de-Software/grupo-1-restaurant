import { useEffect, useRef } from 'react'
import type { EventoAtencion, EventoPedido, EventoReserva } from '../types/Realtime'
import { suscribir } from './conexion'
import { getEchoEmpleado } from './empleado'

// Canales del staff (token Sanctum). Los payloads sólo traen ids y
// estados: cada pantalla decide qué recargar por REST al recibirlos.

type Escuchas = Record<string, (datos: never) => void>

// Suscribe un canal con los manejadores vigentes: se guardan en un ref
// y la suscripción se arma una sola vez por canal, así las pantallas
// pueden pasar funciones nuevas en cada render sin re-suscribirse.
function useCanal(canal: string, escuchas: Escuchas, alConectar?: () => void) {
    const escuchasRef = useRef(escuchas)
    const conectarRef = useRef(alConectar)

    useEffect(() => {
        escuchasRef.current = escuchas
        conectarRef.current = alConectar
    })

    useEffect(() => {
        // Envoltorios estables por evento: al llegar el evento buscan el
        // manejador vigente y permiten desuscribir por (evento, función).
        const envueltos: Escuchas = Object.fromEntries(
            Object.keys(escuchasRef.current).map(evento => [
                evento,
                (datos: never) => escuchasRef.current[evento]?.(datos),
            ]),
        )

        return suscribir(getEchoEmpleado(), canal, envueltos, () => conectarRef.current?.())
    }, [canal])
}

export type ManejadoresPedidos = {
    alCrear?: (evento: EventoPedido) => void
    alCambiarEstado?: (evento: EventoPedido) => void
    alConectar?: () => void
}

// private-empleado.pedidos (ver_pedidos: Gerente, Mozo, Cocina).
export function usePedidosRealtime({ alCrear, alCambiarEstado, alConectar }: ManejadoresPedidos) {
    useCanal('empleado.pedidos', {
        '.pedido.creado': (evento: EventoPedido) => alCrear?.(evento),
        '.pedido.estado': (evento: EventoPedido) => alCambiarEstado?.(evento),
    }, alConectar)
}

export type ManejadoresReservas = {
    alCrear?: (evento: EventoReserva) => void
    alCancelar?: (evento: EventoReserva) => void
    alCambiarEstado?: (evento: EventoReserva) => void
    alConectar?: () => void
}

// private-empleado.reservas (gestionar_reservas: Gerente, Mozo).
export function useReservasRealtime({ alCrear, alCancelar, alCambiarEstado, alConectar }: ManejadoresReservas) {
    useCanal('empleado.reservas', {
        '.reserva.creada': (evento: EventoReserva) => alCrear?.(evento),
        '.reserva.cancelada': (evento: EventoReserva) => alCancelar?.(evento),
        '.reserva.estado': (evento: EventoReserva) => alCambiarEstado?.(evento),
    }, alConectar)
}

export type ManejadoresAtencion = {
    alLlamar?: (evento: EventoAtencion) => void
    alConectar?: () => void
}

// private-empleado.atencion (tomar_pedidos: Gerente, Mozo). Avisa que un
// comensal llamó al mozo desde su mesa.
export function useAtencionRealtime({ alLlamar, alConectar }: ManejadoresAtencion) {
    useCanal('empleado.atencion', {
        '.mesa.atencion': (evento: EventoAtencion) => alLlamar?.(evento),
    }, alConectar)
}
