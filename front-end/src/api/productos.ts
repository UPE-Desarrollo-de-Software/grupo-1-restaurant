import type { Ingrediente, Producto } from "../types/Producto"
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

export async function getIngredientesProducto(
    id: number,
    signal?: AbortSignal
): Promise<Ingrediente[]> {
    const response = await fetch(`${API_BASE_URL}/productos/${id}`, { signal })

    if (!response.ok) {
        throw new Error(`Error ${response.status} al obtener los ingredientes del producto`)
    }

    const data: { ingredientes?: Ingrediente[] } = await response.json()
    if (!Array.isArray(data.ingredientes)) {
        throw new Error('La respuesta del producto no contiene una lista de ingredientes válida')
    }

    return data.ingredientes
}