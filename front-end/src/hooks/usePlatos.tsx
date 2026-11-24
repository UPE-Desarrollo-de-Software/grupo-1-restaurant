import { useEffect, useState } from "react";
import type { PlatoListar } from "../types/Menu";
import { getPlatos } from "../api/platos";

export function usePlatos() {
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [platos, setPlatos] = useState<PlatoListar[]>([])

    useEffect(()=>{
        const controller = new AbortController()

        async function cargarFetch(){
            try {
                // TEMPORAL: probar GastroLoader — abrir /carta?loader para ver la animación completa.
                if (new URLSearchParams(window.location.search).has('loader')) {
                    await new Promise(r => setTimeout(r, 8000))
                }
                const data = await getPlatos(controller.signal)
                setPlatos(data)
                setError(null)
                setLoading(false)
            } catch (err: unknown) {
                if (err instanceof DOMException && err.name === 'AbortError') return
                setError(err instanceof Error ? err.message : 'Error desconocido al cargar el menú')
                setLoading(false)
            }
        }
        
        cargarFetch()
        
        return () =>{
            controller.abort()
        }
    }, [])

    return { platos, loading, error}
}