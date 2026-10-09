import { useEffect, useState } from "react";
import { getCategorias } from "../api/categorias";
import type { Categoria } from "../types/Menu";


export function useCategorias(){
    const [categorias, setCategorias] = useState<Categoria[]>([])
    const [loadingCategorias, setLoading] = useState(true)
    const [errorCategorias, setError] = useState<string | null>(null)

    useEffect(()=>{
        const controller = new AbortController()
        async function cargarFetch() {
            try {
                const data = await getCategorias(controller.signal)
                setCategorias(data)
                setLoading(false)
                setError(null)
            } catch (err) {
                if(err instanceof DOMException && err.name === 'AbortError') return
                setError(err instanceof Error ? err.message : 'Error desconocido al obtener categorias')
                setLoading(false)
            }
        }
        cargarFetch()
        return()=>{
            controller.abort()
        }
    },[])

    return({categorias, loadingCategorias, errorCategorias})
}