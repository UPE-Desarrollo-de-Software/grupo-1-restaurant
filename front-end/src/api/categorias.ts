import type { Categoria, CategoriaInput, CategoriaResponse } from "../types/Menu";
import { API_BASE_URL } from "../config/env";
import { getToken } from "./auth";

export async function getCategorias(signal?: AbortSignal): Promise<Categoria[]> {
    const response = await fetch(`${API_BASE_URL}/categorias`, 
        {signal}
    )
    const data = await response.json()
    if(!response.ok){
        throw new Error(data?.message ?? `Error ${response.status} al obtener categorias`)
    }

    if(!Array.isArray(data)) return []
    return (data as Categoria[]).map(c => ({
        ...c,
        activo: Boolean(c.activo),
    }))
}


export async function createCategoria(categoria:CategoriaInput, signal?: AbortSignal):Promise<CategoriaResponse> {
    const response = await fetch(`${API_BASE_URL}/categorias`,{
        method: 'POST',
        headers:{
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${getToken()}`,
        },
        body: JSON.stringify(categoria),
        signal
    })
    const data = await response.json()
    if(!response.ok){
        throw new Error(data?.message ?? `Error ${response.status} al crear categoría`)
    }
    
    return data
}