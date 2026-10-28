import type { Ingrediente, IngredienteInput, IngredienteResponse } from "../types/Menu";
import { API_BASE_URL } from "../config/env";
import { getToken } from "./auth";
import { mensajeErrorApi } from "./error";

export async function getIngredientes(signal?:AbortSignal): Promise<Ingrediente[]> {
    const response = await fetch(`${API_BASE_URL}/ingredientes`,
        {signal}
    )
    const data = await response.json()
    if(!response.ok){
        throw new Error(mensajeErrorApi(response.status, data, `Error ${response.status} al crear ingrediente`))
    }
    if(!Array.isArray(data)) return []
    return data.map(i => ({
        ...i,
        precioAdicional: Number(i.precioAdicional),
    }))
}

export async function getIngrediente(id: number, signal?: AbortSignal): Promise<Ingrediente> {
    const response = await fetch(`${API_BASE_URL}/ingredientes/${id}`, { signal })
    const data = await response.json().catch(() => null)
    if (!response.ok) {
        throw new Error(data?.message ?? `Error ${response.status} al obtener el ingrediente`)
    }
    return {
        ...data,
        precioAdicional: Number(data.precioAdicional),
    }
}

export async function updateIngrediente(id: number, ingrediente: IngredienteInput): Promise<IngredienteResponse> {
    const response = await fetch(`${API_BASE_URL}/ingredientes/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${getToken()}`,
        },
        body: JSON.stringify(ingrediente),
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) {
        throw new Error(data?.message ?? `Error ${response.status} al actualizar el ingrediente`)
    }
    // El backend responde 200 con {message} si no existe (no es 404).
    if (!data?.ingrediente) {
        throw new Error(data?.message ?? 'No se encontró el ingrediente para actualizar')
    }

    return {
        message: data.message,
        ingrediente: {
            ...data.ingrediente,
            precioAdicional: Number(data.ingrediente.precioAdicional),
        },
    }
}

export async function createIngrediente(ingrediente:IngredienteInput, signal?: AbortSignal): Promise<IngredienteResponse> {
    const response = await fetch(`${API_BASE_URL}/ingredientes`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${getToken()}`,
        },
        body: JSON.stringify(ingrediente),
        signal
    })
    const data = await response.json()
    if (!response.ok) {
        throw new Error(mensajeErrorApi(response.status, data, `Error ${response.status} al actualizar el ingrediente`))
    }

    return{
        message: data.message,
        ingrediente: {
            ...data.ingrediente,
            precioAdicional: Number(data.ingrediente.precioAdicional)
        }
    }
}

export async function deleteIngrediente(id:number, signal?: AbortSignal): Promise<{message: string}> {
    const response = await fetch(`${API_BASE_URL}/ingredientes/${id}`,{
        method: 'DELETE',
        headers:{
            'Content-type': 'application/json',
            'Authorization': `Bearer ${getToken()}`
        },
        signal
    })
    const data = await response.json().catch(()=> null)

    if(!response.ok){
        throw new Error(mensajeErrorApi(response.status, data, `Error ${response.status} al eliminar el ingrediente`))
    }

    return {
        message: data?.message ?? 'Ingrediente eliminado exitosamente'
    }
}