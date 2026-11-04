import type { EstadoPedido } from './Mesa'
import type { EstadoReserva } from './Reserva'

// Payloads de los eventos de Reverb (contrato de WebSockets v1 del
// backend). Sólo traen ids y estados: el detalle siempre se pide por
// REST tras recibir el evento.
export type EventoPedido = {
    pedido_id: number
    mesa_id: number
    estado: EstadoPedido
    estado_anterior?: EstadoPedido
}

export type EventoReserva = {
    reserva_id: number
    mesa_id: number | null
    fecha: string
    hora: string
    estado: EstadoReserva
    cantPersonas?: number
}

export type EventoAtencion = {
    mesa_id: number
    en: string
}
