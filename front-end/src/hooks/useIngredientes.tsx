import { useEffect, useState } from "react";
import type { Ingrediente } from "../types/Menu";
import { getIngredientes } from "../api/ingredientes";

export function useIngredientes(){
    const [listaIngredientes, setListaIngredientes] = useState<Ingrediente[]>([])
    const [loadingIngredientes, setLoading] = useState(true)
    const [errorIngredientes, setError] =  useState<string | null>(null)

    useEffect(()=>{
        const controller = new AbortController()
        async function cargarFetch() {
            try {
                const data = await getIngredientes(controller.signal)
                setListaIngredientes(data)
                setLoading(false)
                setError(null)
            } catch (err) {
                if(err instanceof DOMException && err.name === 'AbortError') return
                setError(err instanceof Error ? err.message : 'Error desconocido al obtener ingredientes')
                setLoading(false)
            }
        }
        cargarFetch()
        return()=>{
            controller.abort()
        }
        
    }, [])

    return({listaIngredientes, loadingIngredientes, errorIngredientes})
}