import type { Categoria } from "../types/Menu";
import { API_BASE_URL } from "../config/env";

export async function getCategorias(signal?: AbortSignal): Promise<Categoria[]> {
    const response = await fetch(`${API_BASE_URL}/categorias`, 
        {signal}
    )
    const data = await response.json()
    if(!response.ok){
        throw new Error(data?.message ?? `Error ${response.status} al obtener categorias`)
    }

    if(!Array.isArray(data)) return []
    return data
}