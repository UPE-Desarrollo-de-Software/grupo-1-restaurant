import type {
    ConfigMesaFila,
    Configuracion,
    DisponibilidadReservas,
    DisponibilidadReservasInput,
} from '../types/Configuracion'
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

function normalizarDisponibilidad(data: Record<string, unknown> | null): DisponibilidadReservas {
    return {
        hora_inicio: String(data?.hora_inicio ?? ''),
        hora_fin: String(data?.hora_fin ?? ''),
        intervalo_minutos: Number(data?.intervalo_minutos ?? 0),
        anticipacion_horas: Number(data?.anticipacion_horas ?? 0),
        slots: Array.isArray(data?.slots) ? (data.slots as unknown[]).map(String) : [],
        total_slots: Number(data?.total_slots ?? 0),
    }
}

// GET /configuracion/disponibilidad: cualquier empleado autenticado.
// Ventana vigente de turnos de reservas + grilla derivada. La consumen
// el panel del gerente y los tres flujos de alta.
export async function getDisponibilidadReservas(signal?: AbortSignal): Promise<DisponibilidadReservas> {
    const response = await fetch(`${API_BASE_URL}/configuracion/disponibilidad`, {
        headers: { 'Authorization': `Bearer ${getToken()}` },
        signal,
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) {
        throw new Error(mensajeErrorApi(response.status, data, `Error ${response.status} al obtener los horarios de reserva`))
    }
    return normalizarDisponibilidad(data)
}

// PUT /configuracion/disponibilidad (Gerente, permiso gestionar_mesas):
// ventana + intervalo de turnos. 422 del back con {message} si el rango
// es inválido. NO se persiste en la base de datos: el backend lo guarda
// en su archivo de runtime (sobrevive al reinicio del contenedor, se
// pierde al redesplegar).
export async function updateDisponibilidadReservas(
    datos: DisponibilidadReservasInput,
): Promise<DisponibilidadReservas> {
    const response = await fetch(`${API_BASE_URL}/configuracion/disponibilidad`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`,
        },
        body: JSON.stringify(datos),
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) {
        throw new Error(mensajeErrorApi(response.status, data, 'Error al actualizar los horarios de reserva'))
    }
    if (!data?.disponibilidad) {
        throw new Error('No se pudieron actualizar los horarios de reserva')
    }
    return normalizarDisponibilidad(data.disponibilidad)
}
