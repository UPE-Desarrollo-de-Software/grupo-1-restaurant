import { useEffect, useRef } from 'react'
import type { EventoAtencion, EventoPedido } from '../types/Realtime'
import { cerrarEchoCliente, getEchoCliente } from './cliente'
import { suscribir } from './conexion'

// Canal del comensal: private-mesa.{id} con el codigo_acceso como Bearer.
// Emite .mesa.atencion (el mozo fue avisado) y los eventos de pedidos
// (.pedido.creado / .pedido.estado): el comensal ve en vivo el alta y el
// avance de sus pedidos en cocina. Los payloads sólo traen ids y estados,
// así que la pantalla refresca por REST.

export type ManejadoresMesa = {
    alLlamarMozo?: (evento: EventoAtencion) => void
    alCrearPedido?: (evento: EventoPedido) => void
    alCambiarEstadoPedido?: (evento: EventoPedido) => void
    alConectar?: () => void
}

export function useMesaRealtime(mesaId: number | null, codigo: string | null, manejadores: ManejadoresMesa) {
    const manejadoresRef = useRef(manejadores)

    useEffect(() => {
        manejadoresRef.current = manejadores
    })

    // Sin sesión de mesa no hay canal: se libera la conexión anterior.
    useEffect(() => {
        if (codigo) return
        cerrarEchoCliente()
    }, [codigo])

    useEffect(() => {
        if (mesaId === null || !codigo) return
        return suscribir(getEchoCliente(codigo), `mesa.${mesaId}`, {
            '.mesa.atencion': (evento: EventoAtencion) => manejadoresRef.current.alLlamarMozo?.(evento),
            '.pedido.creado': (evento: EventoPedido) => manejadoresRef.current.alCrearPedido?.(evento),
            '.pedido.estado': (evento: EventoPedido) => manejadoresRef.current.alCambiarEstadoPedido?.(evento),
        }, () => manejadoresRef.current.alConectar?.())
    }, [mesaId, codigo])
}
