import type { Categoria, CategoriaInput, CategoriaResponse } from "../types/Menu";
import { API_BASE_URL } from "../config/env";
import { getToken } from "./auth";
import { mensajeErrorApi } from "./error";

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

export async function getCategoria(id: number, signal?: AbortSignal): Promise<Categoria> {
    const response = await fetch(`${API_BASE_URL}/categorias/${id}`, { signal })
    const data = await response.json().catch(() => null)
    if (!response.ok) {
        throw new Error(data?.message ?? `Error ${response.status} al obtener la categoría`)
    }
    // El backend responde 200 con {message} cuando la categoría no existe.
    if (!data || typeof data !== 'object' || !('id' in data)) {
        throw new Error(data?.message ?? 'No se encontró la categoría')
    }
    return {
        ...data,
        activo: Boolean(data.activo),
    }
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
        throw new Error(mensajeErrorApi(response.status, data, `Error ${response.status} al crear categoría`))
    }
    
    return data
}

export async function updateCategoria(id: number, categoria: CategoriaInput): Promise<CategoriaResponse> {
    const response = await fetch(`${API_BASE_URL}/categorias/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${getToken()}`,
        },
        body: JSON.stringify(categoria),
    })
    const data = await response.json()
    if (!response.ok) {
        throw new Error(mensajeErrorApi(response.status, data, `Error ${response.status} al actualizar la categoría`))
    }
    return {
        message: data.message,
        categoria: {
            ...data.categoria,
            activo: Boolean(data.categoria.activo),
        },
    }
}

export async function deleteCategoria(id: number): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/categorias/${id}`, {
        method: 'DELETE',
        headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${getToken()}`,
        },
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) {
        throw new Error(mensajeErrorApi(response.status, data, `Error ${response.status} al eliminar la categoría`))
    }
    return { message: data.message }
}