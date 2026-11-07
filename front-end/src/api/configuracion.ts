import type { ConfigMesaFila, Configuracion } from '../types/Configuracion'
import { API_BASE_URL } from '../config/env'
import { getToken } from './auth'
import { mensajeErrorApi } from './error'

function normalizarFila(fila: Record<string, unknown>): ConfigMesaFila {
    return {
        capacidad: Number(fila.capacidad),
        cantidad: Number(fila.cantidad),
    }
}

function normalizarConfiguracion(data: Record<string, unknown> | null): Configuracion {
    const filas = Array.isArray(data?.config_mesas)
        ? (data.config_mesas as Record<string, unknown>[]).map(normalizarFila)
        : []
    return {
        config_mesas: filas,
        aforo: Number(data?.aforo ?? 0),
        mesas_maximas: Number(data?.mesas_maximas ?? 0),
    }
}

// GET /configuracion: cualquier empleado autenticado. Devuelve la
// composición CONFIG_MESA + aforo (Σ capacidad×cantidad) y mesas
// máximas (Σ cantidad).
export async function getConfiguracion(signal?: AbortSignal): Promise<Configuracion> {
    const response = await fetch(`${API_BASE_URL}/configuracion`, {
        headers: { 'Authorization': `Bearer ${getToken()}` },
        signal,
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) {
        throw new Error(mensajeErrorApi(response.status, data, `Error ${response.status} al obtener la configuración`))
    }
    return normalizarConfiguracion(data)
}

// PUT /configuracion (Gerente, permiso gestionar_mesas): REPLACE-ALL
// de las filas capacidad × cantidad. 422 del back si el aforo o el
// tope de mesas quedan por debajo de las mesas vivas.
export async function updateConfiguracion(configMesas: ConfigMesaFila[]): Promise<Configuracion> {
    const response = await fetch(`${API_BASE_URL}/configuracion`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ config_mesas: configMesas }),
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) {
        throw new Error(mensajeErrorApi(response.status, data, 'Error al actualizar la configuración'))
    }
    if (!data?.configuracion) {
        throw new Error('No se pudo actualizar la configuración')
    }
    return normalizarConfiguracion(data.configuracion)
}
