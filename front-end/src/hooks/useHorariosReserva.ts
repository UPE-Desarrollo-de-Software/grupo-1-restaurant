import { useCallback, useEffect, useState } from 'react'
import { disponibilidadDiaReservaWeb } from '../api/cliente'
import type { DisponibilidadDiaReservaWeb } from '../types/Reserva'

interface DiaHorarios {
    datos: DisponibilidadDiaReservaWeb | null
    error: string | null
}

/**
 * Grilla de turnos de una fecha (GET /cliente/reservas/disponibilidad-dia,
 * público). La comparten los tres flujos de alta de reserva (cliente,
 * gerente y mozo), así que no hay copias de la lógica que se puedan
 * desincronizar.
 *
 * Cachea por fecha: al volver a una fecha ya consultada se muestra al
 * instante mientras se refresca. La grilla y la anticipación las define el
 * backend (DisponibilidadReservaService); acá no hay horarios hardcodeados.
 *
 * El setState ocurre dentro del callback async (regla
 * react-hooks/set-state-in-effect).
 */
export function useHorariosReserva(fecha: string) {
    const [dias, setDias] = useState<Record<string, DiaHorarios>>({})
    const [reintento, setReintento] = useState(0)

    useEffect(() => {
        if (!fecha) return

        const controller = new AbortController()
        disponibilidadDiaReservaWeb(fecha, controller.signal)
            .then(datos => {
                setDias(prev => ({ ...prev, [fecha]: { datos, error: null } }))
            })
            .catch(err => {
                if (!controller.signal.aborted) {
                    setDias(prev => ({
                        ...prev,
                        [fecha]: {
                            datos: null,
                            error: err instanceof Error
                                ? err.message
                                : 'No se pudieron cargar los horarios',
                        },
                    }))
                }
            })

        return () => controller.abort()
    }, [fecha, reintento])

    const dia = fecha ? dias[fecha] : undefined

    const reintentar = useCallback(() => setReintento(valor => valor + 1), [])

    const limpiar = useCallback(() => {
        setDias({})
        setReintento(0)
    }, [])

    return {
        datos: dia?.datos ?? null,
        cargando: !!fecha && dia === undefined,
        error: dia?.error ?? null,
        slots: dia?.datos?.slots ?? [],
        reintentar,
        limpiar,
    }
}
