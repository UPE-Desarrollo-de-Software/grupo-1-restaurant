import { API_BASE_URL } from "../config/env"
import { getToken } from "./auth"
import { mensajeErrorApi } from "./error"
import type { EstadoPedido } from "../types/Mesa"

// Toma de pedidos del mozo (permiso tomar_pedidos). Las respuestas de
// éxito traen { mensaje, pedido }; el front solo usa el mensaje y
// después relee el resumen de la mesa.

export interface LineaPedidoAlta {
    plato_id: number
    cantidad: number
    // Ingredientes a AGREGAR (solo los marcados opcional en el plato).
    ingredientes?: number[]
    // Ingredientes a EXCLUIR (solo los marcados por_defecto).
    excluir?: number[]
}

export interface AltaPedidosMesa {
    platos: LineaPedidoAlta[]
    // Pedido en curso al que se suman las líneas; sin él se crea una raíz nueva.
    pedido_id?: number
}

// POST /mesas/{mesa}/pedidos — sin pedido_id crea una raíz nueva; con
// pedido_id agrega a ese pedido si está en curso. 422 con {message}
// (reglas del service: agrega solo a pedidos en curso, etc.).
export async function agregarLineas(mesaId: number, datos: AltaPedidosMesa): Promise<{ mensaje: string }> {
    const response = await fetch(`${API_BASE_URL}/mesas/${mesaId}/pedidos`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${getToken()}`,
        },
        body: JSON.stringify(datos),
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) {
        throw new Error(mensajeErrorApi(response.status, data, `Error ${response.status} al agregar líneas al pedido`))
    }
    return { mensaje: String(data?.mensaje ?? 'Pedido actualizado correctamente.') }
}

// POST /pedidos/{id}/confirmar — 1er paso del envío (gate de líneas
// sin confirmar; `forzar` lo salta). 422 con {message}.
export async function confirmarPedido(pedidoId: number, forzar = false): Promise<{ mensaje: string }> {
    const response = await fetch(`${API_BASE_URL}/pedidos/${pedidoId}/confirmar`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ forzar }),
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) {
        throw new Error(mensajeErrorApi(response.status, data, `Error ${response.status} al confirmar el pedido`))
    }
    return { mensaje: String(data?.mensaje ?? 'Pedido confirmado.') }
}

// POST /pedidos/{id}/enviar — 2do paso: confirmado → enviado (cocina).
export async function enviarPedido(pedidoId: number): Promise<{ mensaje: string }> {
    const response = await fetch(`${API_BASE_URL}/pedidos/${pedidoId}/enviar`, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${getToken()}`,
        },
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) {
        throw new Error(mensajeErrorApi(response.status, data, `Error ${response.status} al enviar el pedido`))
    }
    return { mensaje: String(data?.mensaje ?? 'Pedido enviado correctamente.') }
}

// PUT /pedidos/{id}/estado — avanza por la matriz de transiciones del
// DER (o cancela). 422 con {message} si la transición no existe.
export async function cambiarEstadoPedido(pedidoId: number, estado: EstadoPedido): Promise<{ mensaje: string }> {
    const response = await fetch(`${API_BASE_URL}/pedidos/${pedidoId}/estado`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ estado }),
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) {
        throw new Error(mensajeErrorApi(response.status, data, `Error ${response.status} al cambiar el estado`))
    }
    return { mensaje: String(data?.mensaje ?? `Pedido ahora está '${estado}'.`) }
}
