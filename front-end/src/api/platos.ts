import type { PlatoListar, PlatoInput, PlatoResponse } from "../types/Menu"
import { API_BASE_URL } from "../config/env"
import { getToken } from "./auth"

type PlatoListarJSON = Omit<PlatoListar, 'precio' | 'disponible'> & {
    precio: string | number     // tolera string del GET y number del POST
    disponible: number | boolean
}

export async function getPlatos(signal?: AbortSignal): Promise<PlatoListar[]>{
    const response = await fetch(`${API_BASE_URL}/platos`,
        {signal}
    )

    if(!response.ok){
        throw new Error(`Error ${response.status} al obtener el menú`)
    }

    const data = await response.json()
    if(!Array.isArray(data)) return []
    return (data as PlatoListarJSON[]).map(p => ({
        ...p,
        precio: Number(p.precio),
        disponible: Boolean(p.disponible),
    }))

}

export async function createPlato(plato: PlatoInput, signal?: AbortSignal): Promise<PlatoResponse> {
    const response = await fetch(`${API_BASE_URL}/platos`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${getToken()}`,
        },
        body: JSON.stringify(plato),
        signal
    })

    const data = await response.json().catch(() => null)
    if (!response.ok) {
        throw new Error(data?.message ?? `Error ${response.status} al crear el plato`)
    }

    return {
        ...data,
        plato: { ...data.plato, precio: Number(data.plato.precio), disponible: Boolean(data.plato.disponible) },
    }
}

export async function deletePlato(id: number, signal?: AbortSignal): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/platos/${id}`, {
        method: 'DELETE',
        headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${getToken()}`,
        },
        signal,
    })

    const data = await response.json().catch(() => null)
    if (!response.ok) {
        throw new Error(data?.message ?? `Error ${response.status} al eliminar el plato`)
    }

    return { message: data?.message ?? 'Plato eliminado exitosamente' }
}