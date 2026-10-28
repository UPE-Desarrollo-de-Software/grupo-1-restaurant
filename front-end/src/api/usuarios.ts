import type { Usuario, UsuarioInput, UsuarioEditInput } from "../types/Auth";
import { API_BASE_URL } from "../config/env";
import { getToken } from "./auth";
import { mensajeErrorApi } from "./error";

// El backend manda `activo` con cast boolean; se normaliza igual por convención
// de la capa API (tolerancia a 1/0 si el cast cambiara).
export async function getUsuarios(signal?: AbortSignal): Promise<Usuario[]> {
    const response = await fetch(`${API_BASE_URL}/usuarios`, {
        headers: { 'Authorization': `Bearer ${getToken()}` },
        signal,
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) {
        throw new Error(mensajeErrorApi(response.status, data, `Error ${response.status} al obtener usuarios`))
    }
    if (!Array.isArray(data)) return []
    return data.map(u => ({ ...u, activo: Boolean(u.activo) }))
}

export async function getUsuario(id: number, signal?: AbortSignal): Promise<Usuario> {
    const response = await fetch(`${API_BASE_URL}/usuarios/${id}`, {
        headers: { 'Authorization': `Bearer ${getToken()}` },
        signal,
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) {
        throw new Error(mensajeErrorApi(response.status, data, `Error ${response.status} al obtener el usuario`))
    }
    // El backend responde 200 con {message} cuando el usuario no existe.
    if (!data || typeof data !== 'object' || !('id' in data)) {
        throw new Error(data?.message ?? 'No se encontró el usuario')
    }
    return { ...data, activo: Boolean(data.activo) }
}

export async function createUsuario(usuario: UsuarioInput): Promise<Usuario> {
    const response = await fetch(`${API_BASE_URL}/usuarios/registrar`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${getToken()}`,
        },
        body: JSON.stringify(usuario),
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) {
        throw new Error(mensajeErrorApi(response.status, data, `Error ${response.status} al crear el usuario`))
    }
    return { ...data, activo: Boolean(data.activo) }
}

export async function updateUsuario(id: number, usuario: UsuarioEditInput): Promise<Usuario> {
    const response = await fetch(`${API_BASE_URL}/usuarios/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${getToken()}`,
        },
        body: JSON.stringify(usuario),
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) {
        throw new Error(mensajeErrorApi(response.status, data, `Error ${response.status} al actualizar el usuario`))
    }
    return { ...data, activo: Boolean(data.activo) }
}

export async function deleteUsuario(id: number): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/usuarios/${id}`, {
        method: 'DELETE',
        headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${getToken()}`,
        },
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) {
        throw new Error(mensajeErrorApi(response.status, data, `Error ${response.status} al eliminar el usuario`))
    }
    return { message: data?.message ?? 'Usuario dado de baja exitosamente' }
}

export async function reactivarUsuario(id: number): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/usuarios/${id}/reactivar`, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${getToken()}`,
        },
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) {
        throw new Error(mensajeErrorApi(response.status, data, `Error ${response.status} al reactivar el usuario`))
    }
    return { message: data?.message ?? 'Usuario reactivado exitosamente' }
}