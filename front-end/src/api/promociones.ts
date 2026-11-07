import type { Promocion, PromocionInput, PromocionResponse } from "../types/Menu";
import { API_BASE_URL } from "../config/env";
import { getToken } from "./auth";
import { mensajeErrorApi } from "./error";

// El backend manda `valor` como decimal sin $cast (string) y `activo`
// como boolean con cast: la conversión ocurre UNA sola vez acá.
type PromocionJSON = Omit<Promocion, 'valor' | 'activo'> & {
    valor: string | number | null
    activo: number | boolean
}

function normalizarPromocion(promocion: PromocionJSON): Promocion {
    return {
        ...promocion,
        valor: promocion.valor === null || promocion.valor === undefined ? null : Number(promocion.valor),
        activo: Boolean(promocion.activo),
    }
}

export async function getPromociones(signal?: AbortSignal): Promise<Promocion[]> {
    const response = await fetch(`${API_BASE_URL}/promociones`, {
        headers: { 'Authorization': `Bearer ${getToken()}` },
        signal,
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) {
        throw new Error(mensajeErrorApi(response.status, data, `Error ${response.status} al obtener promociones`))
    }
    // El backend responde 200 con {message} si no hay promociones.
    if (!Array.isArray(data)) return []
    return data.map(p => normalizarPromocion(p as PromocionJSON))
}

export async function getPromocion(id: number, signal?: AbortSignal): Promise<Promocion> {
    const response = await fetch(`${API_BASE_URL}/promociones/${id}`, {
        headers: { 'Authorization': `Bearer ${getToken()}` },
        signal,
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) {
        throw new Error(mensajeErrorApi(response.status, data, `Error ${response.status} al obtener la promoción`))
    }
    // El backend responde 200 con {message} cuando la promoción no existe.
    if (!data || typeof data !== 'object' || !('id' in data)) {
        throw new Error(data?.message ?? 'No se encontró la promoción')
    }
    return normalizarPromocion(data as PromocionJSON)
}

export async function createPromocion(promocion: PromocionInput): Promise<PromocionResponse> {
    const response = await fetch(`${API_BASE_URL}/promociones`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${getToken()}`,
        },
        body: JSON.stringify(promocion),
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) {
        throw new Error(mensajeErrorApi(response.status, data, `Error ${response.status} al crear la promoción`))
    }
    if (!data?.promocion) {
        throw new Error(data?.message ?? 'No se creó la promoción')
    }
    return {
        ...data,
        promocion: normalizarPromocion(data.promocion as PromocionJSON),
    }
}

export async function updatePromocion(id: number, promocion: PromocionInput): Promise<PromocionResponse> {
    const response = await fetch(`${API_BASE_URL}/promociones/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${getToken()}`,
        },
        body: JSON.stringify(promocion),
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) {
        throw new Error(mensajeErrorApi(response.status, data, `Error ${response.status} al actualizar la promoción`))
    }
    // El backend responde 200 con {message} si la promoción no existe.
    if (!data?.promocion) {
        throw new Error(data?.message ?? 'No se encontró la promoción para actualizar')
    }
    return {
        ...data,
        promocion: normalizarPromocion(data.promocion as PromocionJSON),
    }
}

export async function deletePromocion(id: number): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/promociones/${id}`, {
        method: 'DELETE',
        headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${getToken()}`,
        },
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) {
        // Regla de negocio: 422 "La promo ya se aplicó en pedidos: no se
        // puede eliminar, desactivala." — el mensaje del data sale tal cual.
        throw new Error(mensajeErrorApi(response.status, data, `Error ${response.status} al eliminar la promoción`))
    }
    return { message: data?.message ?? 'Promoción eliminada exitosamente' }
}
