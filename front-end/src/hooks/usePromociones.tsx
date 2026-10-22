import { useEffect, useState } from "react";
import { getPromociones } from "../api/promociones";
import type { Promocion } from "../types/Menu";

export function usePromociones(){
    const [promociones, setPromociones] = useState<Promocion[]>([])
    const [loadingPromociones, setLoading] = useState(true)
    const [errorPromociones, setError] = useState<string | null>(null)

    useEffect(()=>{
        const controller = new AbortController()
        async function cargarFetch() {
            try {
                const data = await getPromociones(controller.signal)
                setPromociones(data)
                setLoading(false)
                setError(null)
            } catch (err) {
                if(err instanceof DOMException && err.name === 'AbortError') return
                setError(err instanceof Error ? err.message : 'Error desconocido al obtener promociones')
                setLoading(false)
            }
        }
        cargarFetch()
        return()=>{
            controller.abort()
        }
    },[])

    return({promociones, loadingPromociones, errorPromociones})
}
