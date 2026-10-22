import { API_BASE_URL } from "../config/env"
import type { ClienteMesa } from "../types/Cliente"
import type { CuentaMesa, ResumenMesa } from "../types/Mesa"
import type { MesaReservaWeb, Reserva, ReservaResponse, ReservaWebAlta } from "../types/Reserva"
import type { AltaPedidosMesa } from "./pedidos"

// Auto-pedido del comensal: NO usa Sanctum. La credencial es el
// codigo_acceso de la mesa (4 dígitos) y viaja como Bearer en /cliente/*.
// El 401 en este flujo no es "sesión expirada": es código inválido o
// mesa destruida, así que se traduce a un mensaje accionable propio.

export class ErrorCliente extends Error {
    readonly status: number
    constructor(mensaje: string, status: number) {
        super(mensaje)
        this.name = 'ErrorCliente'
        this.status = status
    }
}

function mensajeCliente(status: number, data: { message?: string } | null, porDefecto: string): string {
    if (status === 401) return 'El código de mesa no es válido o la mesa ya no está activa. Revísalo con tu mozo.'
    return data?.message ?? porDefecto
}

function cabecera(codigo: string): Record<string, string> {
    return {
        'Accept': 'application/json',
        'Authorization': `Bearer ${codigo}`,
    }
}

// POST /acceso — valida el código (público; 10 intentos/min por IP →
// 429 con {message} en español; 401 si no corresponde a una mesa viva).
export async function acceder(codigo: string, signal?: AbortSignal): Promise<ClienteMesa> {
    const response = await fetch(`${API_BASE_URL}/acceso`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify({ codigo }),
        signal,
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) {
        throw new ErrorCliente(mensajeCliente(response.status, data, `Error ${response.status} al validar el código de la mesa`), response.status)
    }
    return data?.mesa as ClienteMesa
}

// GET /cliente/pedidos — resumen de la mesa (mismo shape que el staff):
// todos los pedidos activos con sus líneas; el front ubica los suyos por
// los pedidoIds guardados. 401 → código de mesa inválido.
export async function getPedidosCliente(codigo: string, signal?: AbortSignal): Promise<ResumenMesa> {
    const response = await fetch(`${API_BASE_URL}/cliente/pedidos`, {
        method: 'GET',
        headers: cabecera(codigo),
        signal,
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) {
        throw new ErrorCliente(mensajeCliente(response.status, data, `Error ${response.status} al consultar los pedidos de la mesa`), response.status)
    }
    return data as ResumenMesa
}

// POST /cliente/pedidos — crea (sin pedido_id) o anexa (con pedido_id)
// las líneas del borrador. Las líneas nacen confirmado=false. 422 con
// {message} (p. ej. anexar a un pedido que ya no está en curso).
export async function agregarLineasCliente(codigo: string, datos: AltaPedidosMesa): Promise<{ mensaje: string; pedidoId: number }> {
    const response = await fetch(`${API_BASE_URL}/cliente/pedidos`, {
        method: 'POST',
        headers: {
            ...cabecera(codigo),
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(datos),
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) {
        throw new ErrorCliente(mensajeCliente(response.status, data, `Error ${response.status} al crear el pedido`), response.status)
    }
    return {
        mensaje: String(data?.mensaje ?? 'Pedido actualizado correctamente.'),
        pedidoId: Number(data?.pedido?.id ?? 0),
    }
}

// POST /cliente/pedidos/confirmar — marca las líneas como confirmadas
// (gate del envío). Body: { pedido_id, detalle_ids? }.
export async function confirmarLineasCliente(codigo: string, pedidoId: number): Promise<{ mensaje: string }> {
    const response = await fetch(`${API_BASE_URL}/cliente/pedidos/confirmar`, {
        method: 'POST',
        headers: {
            ...cabecera(codigo),
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pedido_id: pedidoId }),
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) {
        throw new ErrorCliente(mensajeCliente(response.status, data, `Error ${response.status} al confirmar el pedido`), response.status)
    }
    return { mensaje: String(data?.mensaje ?? 'Pedido confirmado.') }
}

// GET /cliente/cuenta — cuenta de la visita dividida en PARTES por
// pedido raíz (mismo shape que la cuenta del mozo). El front identifica
// "su parte" con los pedidoIds guardados. El codigo_acceso que trae la
// respuesta jamás se renderiza.
export async function getCuentaCliente(codigo: string, signal?: AbortSignal): Promise<CuentaMesa> {
    const response = await fetch(`${API_BASE_URL}/cliente/cuenta`, {
        method: 'GET',
        headers: cabecera(codigo),
        signal,
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) {
        throw new ErrorCliente(mensajeCliente(response.status, data, `Error ${response.status} al consultar la cuenta de la mesa`), response.status)
    }
    if (!data || !Array.isArray(data.partes)) {
        throw new ErrorCliente('No se pudo obtener la cuenta de la mesa. Probá de nuevo.', response.status)
    }
    return data as CuentaMesa
}

// GET /cliente/reservas/mesas — mapa de mesas para elegir (PÚBLICO con
// throttle): solo id/capacidad/estado; el codigo_acceso nunca se expone.
export async function mesasReservaWeb(signal?: AbortSignal): Promise<MesaReservaWeb[]> {
    const response = await fetch(`${API_BASE_URL}/cliente/reservas/mesas`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal,
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) {
        throw new ErrorCliente(`Error ${response.status} al consultar las mesas disponibles`, response.status)
    }
    return Array.isArray(data) ? (data as MesaReservaWeb[]) : []
}

// POST /cliente/reservas — alta de reserva del cliente (PÚBLICO con
// throttle). Sin mesa_id el sistema crea la mesa como "mozo virtual"
// validando el aforo; 422 con {message} (anticipación mínima, aforo o
// conflicto de fecha+hora) y 404 si la mesa no existe. Respuesta 201
// { mensaje, reserva }.
export async function solicitarReservaWeb(datos: ReservaWebAlta): Promise<Reserva> {
    const response = await fetch(`${API_BASE_URL}/cliente/reservas`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify(datos),
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) {
        throw new ErrorCliente(
            (data as { message?: string } | null)?.message ?? `Error ${response.status} al solicitar la reserva`,
            response.status,
        )
    }
    const creada = (data as ReservaResponse | null)?.reserva
    if (!creada) {
        throw new ErrorCliente('La reserva no se registró correctamente. Probá de nuevo.', response.status)
    }
    // Mismo recorte que la capa de reservas del staff: 'Y-m-d' y 'HH:mm'.
    return {
        ...creada,
        fecha: (creada.fecha ?? '').slice(0, 10),
        hora: (creada.hora ?? '').slice(0, 5),
    }
}
