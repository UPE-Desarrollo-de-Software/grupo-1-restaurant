import type { Ingrediente } from "../types/Menu";
import { API_BASE_URL } from "../config/env";

export async function getIngredientes(signal?:AbortSignal): Promise<Ingrediente[]> {
    const response = await fetch(`${API_BASE_URL}/ingredientes`,
        {signal}
    )
    const data = await response.json()
    if(!response.ok){
        throw new Error(data?.message ?? `Error ${response.status} al obtener ingredientes`)
    }
    if(!Array.isArray(data)) return []
    return data
}