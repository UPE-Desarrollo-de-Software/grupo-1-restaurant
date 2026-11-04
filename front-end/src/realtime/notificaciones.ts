import type { Notificacion } from '../types/Notificacion'
import type { EventoAtencion, EventoPedido } from '../types/Realtime'

// Store de notificaciones del mozo. Vive a nivel de módulo (no es un
// contexto de React) para que la campana del Navbar, el modal y las
// páginas compartan el mismo listado aunque cambien de ruta. Se
// persiste en localStorage: el relevo de la caja no pierde avisos al
// recargar. Tope corto para no acumular basura en el navegador.
export const MAXIMO_NOTIFICACIONES = 20

const CLAVE = 'gastro_notificaciones_mozo'

// --- Persistencia ---------------------------------------------------

function esNotificacion(valor: unknown): valor is Notificacion {
    if (typeof valor !== 'object' || valor === null) return false
    const posible = valor as Record<string, unknown>
    return (
        typeof posible.id === 'string' &&
        typeof posible.tipo === 'string' &&
        typeof posible.titulo === 'string' &&
        typeof posible.detalle === 'string' &&
        typeof posible.mesa_id === 'number' &&
        typeof posible.fecha === 'string' &&
        typeof posible.leida === 'boolean'
    )
}

function cargar(): Notificacion[] {
    try {
        const crudo = localStorage.getItem(CLAVE)
        if (!crudo) return []
        const datos: unknown = JSON.parse(crudo)
        if (!Array.isArray(datos)) return []
        return datos.filter(esNotificacion).slice(0, MAXIMO_NOTIFICACIONES)
    } catch {
        // Sin localStorage (modo privado/cuota): el store sigue en memoria.
        return []
    }
}

function guardar(notificaciones: Notificacion[]) {
    try {
        localStorage.setItem(CLAVE, JSON.stringify(notificaciones))
    } catch {
        // Igual que arriba: la sesión sigue funcionando sin persistencia.
    }
}

// --- Store ----------------------------------------------------------

let notificaciones: Notificacion[] = cargar()
const oyentes = new Set<() => void>()

function actualizar(nuevas: Notificacion[]) {
    notificaciones = nuevas
    guardar(notificaciones)
    for (const oyente of oyentes) oyente()
}

export function obtenerNotificaciones(): Notificacion[] {
    return notificaciones
}

export function suscribirse(oyente: () => void): () => void {
    oyentes.add(oyente)
    return () => {
        oyentes.delete(oyente)
    }
}

export function agregarNotificacion(notificacion: Notificacion): void {
    actualizar([notificacion, ...notificaciones].slice(0, MAXIMO_NOTIFICACIONES))
}

export function marcarLeida(id: string): void {
    if (!notificaciones.some(n => n.id === id && !n.leida)) return
    actualizar(notificaciones.map(n => (n.id === id ? { ...n, leida: true } : n)))
}

export function marcarTodasLeidas(): void {
    if (notificaciones.every(n => n.leida)) return
    actualizar(notificaciones.map(n => ({ ...n, leida: true })))
}

export function limpiarNotificaciones(): void {
    if (notificaciones.length === 0) return
    actualizar([])
}

// --- Eventos de Reverb → notificación -------------------------------

function nuevoId(): string {
    try {
        return crypto.randomUUID()
    } catch {
        return `${Date.now()}-${Math.random().toString(16).slice(2)}`
    }
}

function nombreMesa(mesaId: number): string {
    return `Mesa ${String(mesaId).padStart(2, '0')}`
}

function base(tipo: Notificacion['tipo'], mesaId: number): Omit<Notificacion, 'titulo' | 'detalle'> {
    return {
        id: nuevoId(),
        tipo,
        mesa_id: mesaId,
        fecha: new Date().toISOString(),
        leida: false,
    }
}

export function notificacionAtencion(evento: EventoAtencion): Notificacion {
    return {
        ...base('atencion', evento.mesa_id),
        titulo: `${nombreMesa(evento.mesa_id)} pidió atención`,
        detalle: 'El cliente llamó al mozo desde esta mesa.',
    }
}

export function notificacionPedidoCreado(evento: EventoPedido): Notificacion {
    return {
        ...base('pedido', evento.mesa_id),
        titulo: `${nombreMesa(evento.mesa_id)} — nuevo pedido`,
        detalle: `Se creó el pedido #${evento.pedido_id}.`,
        pedido_id: evento.pedido_id,
    }
}

// La cocina avanza los pedidos por varios estados; el mozo sólo necesita
// saber cuándo están listos para entregar (el suscriptor filtra por
// `estado === 'listo'`).
export function notificacionPedidoEstado(evento: EventoPedido): Notificacion {
    return {
        ...base('pedido', evento.mesa_id),
        titulo: `${nombreMesa(evento.mesa_id)} — pedido #${evento.pedido_id}`,
        detalle: 'Listo para entregar.',
        pedido_id: evento.pedido_id,
    }
}
