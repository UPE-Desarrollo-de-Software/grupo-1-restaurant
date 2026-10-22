import type { Reserva, ReservaInput, ReservaResponse } from "../types/Reserva";
import { API_BASE_URL } from "../config/env";
import { getToken } from "./auth";
import { mensajeErrorApi } from "./error";

// A diferencia del resto de los ABM, GET /reservas/{id} y las
// transiciones responden 404 REAL (no 200 con {message}); los éxitos
// vienen con clave `mensaje` (no `message`).
type ReservaJSON = Omit<Reserva, 'fecha' | 'hora'> & {
    fecha?: string | null
    hora?: string | null
}

function normalizarReserva(reserva: ReservaJSON): Reserva {
    return {
        ...reserva,
        // DATE/TIME pueden venir con formato largo según el driver.
        fecha: (reserva.fecha ?? '').slice(0, 10),
        hora: (reserva.hora ?? '').slice(0, 5),
    }
}

export async function getReservas(signal?: AbortSignal): Promise<Reserva[]> {
    const response = await fetch(`${API_BASE_URL}/reservas`, {
        headers: { 'Authorization': `Bearer ${getToken()}` },
        signal,
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) {
        throw new Error(mensajeErrorApi(response.status, data, `Error ${response.status} al obtener reservas`))
    }
    // El backend responde 200 con {message} si no hay reservas.
    if (!Array.isArray(data)) return []
    return data.map(r => normalizarReserva(r as ReservaJSON))
}

export async function getReserva(id: number, signal?: AbortSignal): Promise<Reserva> {
    const response = await fetch(`${API_BASE_URL}/reservas/${id}`, {
        headers: { 'Authorization': `Bearer ${getToken()}` },
        signal,
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) {
        throw new Error(mensajeErrorApi(response.status, data, `Error ${response.status} al obtener la reserva`))
    }
    if (!data || typeof data !== 'object' || !('id' in data)) {
        throw new Error(data?.message ?? 'No se encontró la reserva')
    }
    return normalizarReserva(data as ReservaJSON)
}

export async function createReserva(reserva: ReservaInput): Promise<ReservaResponse> {
    const response = await fetch(`${API_BASE_URL}/reservas`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${getToken()}`,
        },
        body: JSON.stringify(reserva),
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) {
        // 404 "Mesa no encontrada" y 422 de reglas de negocio
        // (lead time, capacidad, conflicto horario) salen por acá.
        throw new Error(mensajeErrorApi(response.status, data, `Error ${response.status} al crear la reserva`))
    }
    if (!data?.reserva) {
        throw new Error(data?.mensaje ?? data?.message ?? 'No se creó la reserva')
    }
    return {
        mensaje: data.mensaje ?? 'Reserva creada correctamente.',
        reserva: normalizarReserva(data.reserva as ReservaJSON),
    }
}

// PATCH /reservas/{id}/{cancelar|finalizar|inasistio} — misma forma de
// respuesta: 200 {mensaje, reserva}, 404 real o 422 con {message}.
async function transicion(
    accion: 'cancelar' | 'finalizar' | 'inasistio',
    id: number,
    mensajePorDefecto: string,
): Promise<ReservaResponse> {
    const response = await fetch(`${API_BASE_URL}/reservas/${id}/${accion}`, {
        method: 'PATCH',
        headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${getToken()}`,
        },
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) {
        throw new Error(mensajeErrorApi(response.status, data, `Error ${response.status} al ${accion} la reserva`))
    }
    if (!data?.reserva) {
        throw new Error(data?.mensaje ?? data?.message ?? mensajePorDefecto)
    }
    return {
        mensaje: data.mensaje ?? mensajePorDefecto,
        reserva: normalizarReserva(data.reserva as ReservaJSON),
    }
}

export function cancelarReserva(id: number): Promise<ReservaResponse> {
    return transicion('cancelar', id, 'Reserva cancelada correctamente')
}

export function finalizarReserva(id: number): Promise<ReservaResponse> {
    return transicion('finalizar', id, 'Reserva finalizada correctamente')
}

export function inasistioReserva(id: number): Promise<ReservaResponse> {
    return transicion('inasistio', id, 'Inasistencia registrada')
}
