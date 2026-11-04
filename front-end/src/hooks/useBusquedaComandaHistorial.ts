import { useCallback, useEffect, useRef, useState } from 'react'
import { getComandaHistorial } from '../api/historial'
import type { ComandaHistorial } from '../types/Historial'

// Búsqueda exacta por número de comanda. No depende del período del
// listado y admite cualquier estado (también comandas activas).
export function useBusquedaComandaHistorial() {
    const [comanda, setComanda] = useState<ComandaHistorial | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [buscando, setBuscando] = useState(false)
    const controllerRef = useRef<AbortController | null>(null)

    const buscar = useCallback((id: number): Promise<void> => {
        controllerRef.current?.abort()
        const controller = new AbortController()
        controllerRef.current = controller
        setBuscando(true)
        setError(null)
        setComanda(null)

        return getComandaHistorial(id, controller.signal)
            .then(datos => {
                if (controller.signal.aborted) return
                setComanda(datos)
            })
            .catch(err => {
                if (controller.signal.aborted || (err instanceof DOMException && err.name === 'AbortError')) return
                setError(err instanceof Error ? err.message : 'No se pudo buscar la comanda')
            })
            .finally(() => {
                if (!controller.signal.aborted) setBuscando(false)
            })
    }, [])

    const limpiar = useCallback(() => {
        controllerRef.current?.abort()
        setComanda(null)
        setError(null)
        setBuscando(false)
    }, [])

    useEffect(() => () => controllerRef.current?.abort(), [])

    return {
        comanda,
        error,
        buscando,
        buscar,
        limpiar,
    }
}
