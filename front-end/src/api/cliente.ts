import { API_BASE_URL } from "../config/env"
import type { ClienteMesa } from "../types/Cliente"
import type { CuentaMesa, ResumenMesa } from "../types/Mesa"
import type { DisponibilidadDiaReservaWeb, LineaPreorden, Reserva, ReservaResponse, ReservaWebAlta } from "../types/Reserva"
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

// POST /cliente/llamar — "llamar al mozo": sin body. Rate limit del
// backend de 1/min por mesa → 429 "Ya pediste atención: el mozo ya fue
// avisado." (message en español). El aviso al mozo (websocket
// empleado.atencion) se verá cuando el front integre Reverb; hoy el
// cliente sólo recibe su confirmación.
export async function llamarMozo(codigo: string): Promise<{ mensaje: string }> {
    const response = await fetch(`${API_BASE_URL}/cliente/llamar`, {
        method: 'POST',
        headers: cabecera(codigo),
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) {
        throw new ErrorCliente(
            mensajeCliente(response.status, data, `Error ${response.status} al pedir atención`),
            response.status,
        )
    }
    return { mensaje: String((data as { mensaje?: string } | null)?.mensaje ?? 'El mozo fue avisado.') }
}

// GET /cliente/reservas/disponibilidad-dia?fecha= — (PÚBLICO con
// throttle) grilla fija de turnos (12:00–23:00 cada 30 min) con el
// aforo que queda libre en cada uno. Una sola request por fecha.
export async function disponibilidadDiaReservaWeb(
    fecha: string,
    signal?: AbortSignal,
): Promise<DisponibilidadDiaReservaWeb> {
    const params = new URLSearchParams({ fecha })
    const response = await fetch(`${API_BASE_URL}/cliente/reservas/disponibilidad-dia?${params.toString()}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal,
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) {
        throw new ErrorCliente(
            `Error ${response.status} al consultar los horarios`,
            response.status,
        )
    }
    return data as DisponibilidadDiaReservaWeb
}

// POST /cliente/reservas — alta de reserva del cliente (PÚBLICO con
// throttle). NO hay mesa que elegir: el backend asigna una combinación
// de capacidades del CONFIG_MESA. 422 con {message} (anticipación
// mínima, aforo insuficiente o conflicto de fecha+hora). Respuesta 201
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

// ==== PRE-ORDEN DE LA RESERVA (PÚBLICO con throttle, clave = PIN) ====
// Mismo criterio que /acceso: PIN mal formado → 422, PIN que no
// corresponde a ninguna reserva → 401. La reserva deja de aceptar
// cambios cuando ya no está pendiente (422 con {message}).

function mensajePreorden(status: number, data: { message?: string } | null, porDefecto: string): string {
    if (status === 401) return 'El PIN de reserva no es válido o expiró. Revísalo en tu comprobante.'
    return data?.message ?? porDefecto
}

// GET /cliente/reservas/{codigo}/preordenes — las líneas guardadas
// (`[{plato_id, cantidad}]`; vacío = sin pre-orden).
export async function getPreordenCliente(codigo: string, signal?: AbortSignal): Promise<LineaPreorden[]> {
    const response = await fetch(`${API_BASE_URL}/cliente/reservas/${codigo}/preordenes`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal,
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) {
        throw new ErrorCliente(
            mensajePreorden(response.status, data, `Error ${response.status} al consultar la pre-orden`),
            response.status,
        )
    }
    return Array.isArray(data) ? (data as LineaPreorden[]) : []
}

// PUT /cliente/reservas/{codigo}/preordenes — reemplaza las cantidades
// de las líneas que manda (merge por plato_id del lado del back: NO
// borra las ausentes; para reemplazar el carrito entero va
// DELETE + PUT, ver la página de pre-orden). Respuesta:
// { mensaje, preorden }.
export async function guardarPreordenCliente(codigo: string, lineas: LineaPreorden[]): Promise<LineaPreorden[]> {
    const response = await fetch(`${API_BASE_URL}/cliente/reservas/${codigo}/preordenes`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify({ preorden: lineas }),
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) {
        throw new ErrorCliente(
            mensajePreorden(response.status, data, `Error ${response.status} al guardar la pre-orden`),
            response.status,
        )
    }
    const preorden = (data as { preorden?: LineaPreorden[] } | null)?.preorden
    return Array.isArray(preorden) ? preorden : []
}

// DELETE /cliente/reservas/{codigo}/preordenes — vacía la pre-orden
// (única forma de borrar líneas: el PUT solo suma/actualiza).
export async function eliminarPreordenCliente(codigo: string): Promise<{ mensaje: string }> {
    const response = await fetch(`${API_BASE_URL}/cliente/reservas/${codigo}/preordenes`, {
        method: 'DELETE',
        headers: { 'Accept': 'application/json' },
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) {
        throw new ErrorCliente(
            mensajePreorden(response.status, data, `Error ${response.status} al vaciar la pre-orden`),
            response.status,
        )
    }
    return { mensaje: String((data as { mensaje?: string } | null)?.mensaje ?? 'Pre-orden vaciada.') }
}
