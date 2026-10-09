import type { ProductoListar, ProductoInput, ProductoResponse } from "../types/Menu"
import { API_BASE_URL } from "../config/env"
import { getToken } from "./auth"

type ProductoListarJSON = Omit<ProductoListar, 'precio' | 'disponible'> & {
    precio: string | number     // tolera string del GET y number del POST
    disponible: number | boolean
}

export async function getProductos(signal?: AbortSignal): Promise<ProductoListar[]>{
    const response = await fetch(`${API_BASE_URL}/productos`,
        {signal}
    )

    if(!response.ok){
        throw new Error(`Error ${response.status} al obtener el menú`)
    }

    const data = await response.json()
    if(!Array.isArray(data)) return []
    return (data as ProductoListarJSON[]).map(p => ({
        ...p,
        precio: Number(p.precio),
        disponible: Boolean(p.disponible),
    }))

}

export async function createProductos(producto: ProductoInput, signal?: AbortSignal): Promise<ProductoResponse> {
    const response = await fetch(`${API_BASE_URL}/productos`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${getToken()}`,
        },
        body: JSON.stringify(producto),
        signal
    })

    const data = await response.json().catch(() => null)
    if (!response.ok) {
        throw new Error(data?.message ?? `Error ${response.status} al crear el producto`)
    }

    return {
        ...data,
        producto: { ...data.producto, precio: Number(data.producto.precio), disponible: Boolean(data.producto.disponible) },
    }
}