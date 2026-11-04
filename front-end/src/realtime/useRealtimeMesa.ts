import { useEffect, useRef } from 'react'
import type { EventoAtencion } from '../types/Realtime'
import { cerrarEchoCliente, getEchoCliente } from './cliente'
import { suscribir } from './conexion'

// Canal del comensal: private-mesa.{id} con el codigo_acceso como Bearer.
// Hoy sólo emite .mesa.atencion (el mozo fue avisado); los eventos de
// pedidos van únicamente a los canales de empleados.

export type ManejadoresMesa = {
    alLlamarMozo?: (evento: EventoAtencion) => void
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
        }, () => manejadoresRef.current.alConectar?.())
    }, [mesaId, codigo])
}
