import { useEffect, useState } from "react";
import type { Producto } from "../types/Producto";
import { getProductos } from "../api/productos";

export function useProductos() {
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [productos, setProductos] = useState<Producto[]>([])

    useEffect(()=>{
        const controller = new AbortController()

        async function cargarFetch(){
            try {
                const data = await getProductos(controller.signal)
                setProductos(data)
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

    return { productos, loading, error}
}