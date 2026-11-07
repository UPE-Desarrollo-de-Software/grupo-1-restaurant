import { useCallback, useEffect, useRef, useState } from 'react'
import { getCocinaPedidos } from '../api/cocina'
import type { PedidoCocina } from '../types/Mesa'

// Cola de cocina compartida por la gestión de comandas y la vista
// individual. `pedidos === null && !error` deriva el loading (regla
// set-state-in-effect): el estado se setea en los callbacks async.
export function useCocinaPedidos() {
    const [pedidos, setPedidos] = useState<PedidoCocina[] | null>(null)
    const [error, setError] = useState<string | null>(null)
    const controllerRef = useRef<AbortController | null>(null)

    const cargar = useCallback((): Promise<void> => {
        controllerRef.current?.abort()
        const controller = new AbortController()
        controllerRef.current = controller

        return getCocinaPedidos(controller.signal)
            .then(datos => {
                if (controller.signal.aborted) return
                setPedidos(datos)
                setError(null)
            })
            .catch(err => {
                if (controller.signal.aborted || (err instanceof DOMException && err.name === 'AbortError')) return
                setError(err instanceof Error ? err.message : 'No se pudo cargar la cola de cocina')
            })
    }, [])

    useEffect(() => {
        cargar()
        return () => controllerRef.current?.abort()
    }, [cargar])

    return {
        pedidos,
        error,
        cargando: pedidos === null && error === null,
        recargar: cargar,
    }
}
