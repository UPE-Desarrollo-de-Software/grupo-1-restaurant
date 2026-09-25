import type { Producto } from "../types/Producto"
import { API_BASE_URL } from "../config/env"

export async function getProductos(signal?: AbortSignal): Promise<Producto[]>{
    const response = await fetch(`${API_BASE_URL}/productos`,
        {signal}
    )

    if(!response.ok){
        throw new Error(`Error ${response.status} al obtener el menú`)
    }

    const data: Producto[] = await response.json()
    if(!Array.isArray(data)) return []
    return data
}