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