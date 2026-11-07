import { useCallback, useEffect, useRef, useState } from 'react'
import { getHistorialComandas } from '../api/historial'
import type { PaginaHistorial } from '../types/Historial'

interface Opciones {
    desde: string
    hasta: string
    page: number
    perPage?: number
}

interface Resultado {
    clave: string
    pagina: PaginaHistorial
}

interface ErrorHistorial {
    clave: string
    mensaje: string
}

// Listado paginado del historial. La clave identifica el período y la
// página pedidos: mientras no llegue la respuesta de esa clave (y no haya
// error), la UI deriva el loading sin setear estado síncrono en el efecto.
export function useHistorialComandas({ desde, hasta, page, perPage = 20 }: Opciones) {
    const [resultado, setResultado] = useState<Resultado | null>(null)
    const [error, setError] = useState<ErrorHistorial | null>(null)
    const controllerRef = useRef<AbortController | null>(null)
    const clave = `${desde}|${hasta}|${page}|${perPage}`

    const cargar = useCallback((): Promise<void> => {
        controllerRef.current?.abort()
        const controller = new AbortController()
        controllerRef.current = controller

        return getHistorialComandas(
            { desde, hasta, page, per_page: perPage },
            controller.signal,
        )
            .then(pagina => {
                if (controller.signal.aborted) return
                setResultado({ clave, pagina })
                setError(null)
            })
            .catch(err => {
                if (controller.signal.aborted || (err instanceof DOMException && err.name === 'AbortError')) return
                setError({
                    clave,
                    mensaje: err instanceof Error ? err.message : 'No se pudo cargar el historial de comandas',
                })
            })
    }, [clave, desde, hasta, page, perPage])

    useEffect(() => {
        cargar()
        return () => controllerRef.current?.abort()
    }, [cargar])

    const reintentar = useCallback((): Promise<void> => {
        setError(null)
        return cargar()
    }, [cargar])

    const pagina = resultado?.clave === clave ? resultado.pagina : null
    const errorActual = error?.clave === clave ? error.mensaje : null

    return {
        pagina,
        error: errorActual,
        cargando: pagina === null && errorActual === null,
        recargar: cargar,
        reintentar,
    }
}
