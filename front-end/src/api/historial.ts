import type {
    ComandaHistorial,
    FiltrosHistorialComandas,
    LineaComandaHistorial,
    PaginaHistorial,
} from '../types/Historial'
import type { EstadoPedido, PromocionLinea } from '../types/Mesa'
import { API_BASE_URL } from '../config/env'
import { getToken } from './auth'
import { mensajeErrorApi } from './error'

// Historial de comandas (permiso ver_historial_comandas: Gerente y
// Cocina). El backend devuelve el paginador de Laravel directo con
// modelos ya armados como array (ReporteService::comandaAArray), así
// que acá se normalizan los números UNA sola vez (patrón del proyecto).
// El `codigo_acceso` de la mesa nunca se mapea ni se renderiza.

interface LineaJSON {
    detalle_id?: number
    plato_id?: number
    plato?: string | null
    cantidad?: number | string
    precio_lista?: number | string
    subtotal?: number | string
    promocion?: PromocionLinea | null
    confirmado?: boolean | number | null
}

interface MesaJSON {
    id?: number
    capacidad?: number | string
    destruida?: boolean
}

interface ComandaJSON {
    id?: number
    pedido_padre_id?: number | null
    estado?: string
    total?: number | string
    fecha?: string
    mesa?: MesaJSON | null
    lineas?: LineaJSON[] | null
}

interface PaginaJSON {
    data?: ComandaJSON[]
    current_page?: number | string
    last_page?: number | string
    per_page?: number | string
    total?: number | string
    from?: number | string | null
    to?: number | string | null
}

function numero(valor: unknown, porDefecto = 0): number {
    const n = Number(valor)
    return Number.isFinite(n) ? n : porDefecto
}

function normalizarPromocion(promocion: PromocionLinea | null | undefined): PromocionLinea | null {
    if (!promocion) return null
    return {
        id: numero(promocion.id),
        nombre: String(promocion.nombre ?? ''),
        tipo: String(promocion.tipo ?? ''),
    }
}

function normalizarLinea(linea: LineaJSON): LineaComandaHistorial {
    return {
        detalle_id: numero(linea.detalle_id),
        plato_id: numero(linea.plato_id),
        plato: String(linea.plato ?? 'Plato'),
        cantidad: numero(linea.cantidad),
        precio_lista: numero(linea.precio_lista),
        subtotal: numero(linea.subtotal),
        promocion: normalizarPromocion(linea.promocion),
        confirmado: Boolean(linea.confirmado),
    }
}

function normalizarComanda(comanda: ComandaJSON): ComandaHistorial {
    return {
        id: numero(comanda.id),
        pedido_padre_id: comanda.pedido_padre_id == null ? null : numero(comanda.pedido_padre_id),
        estado: (comanda.estado ?? 'cerrado') as EstadoPedido,
        total: numero(comanda.total),
        fecha: String(comanda.fecha ?? ''),
        mesa: comanda.mesa
            ? {
                id: numero(comanda.mesa.id),
                capacidad: numero(comanda.mesa.capacidad),
                destruida: Boolean(comanda.mesa.destruida),
            }
            : null,
        lineas: (comanda.lineas ?? []).map(normalizarLinea),
    }
}

function normalizarPagina(data: PaginaJSON | null): PaginaHistorial {
    const comandas = Array.isArray(data?.data) ? data.data : []
    const normalizadas = comandas.map(normalizarComanda)
    return {
        data: normalizadas,
        current_page: numero(data?.current_page, 1),
        last_page: numero(data?.last_page, 1),
        per_page: numero(data?.per_page, normalizadas.length),
        total: numero(data?.total, normalizadas.length),
        from: data?.from == null ? null : numero(data.from),
        to: data?.to == null ? null : numero(data.to),
    }
}

function armarQuery(filtros: FiltrosHistorialComandas): string {
    const params = new URLSearchParams()
    for (const [clave, valor] of Object.entries(filtros)) {
        if (valor === undefined || valor === null || valor === '') continue
        params.set(clave, String(valor))
    }
    const query = params.toString()
    return query ? `?${query}` : ''
}

// GET /historial/comandas?desde=&hasta=&estado=&mesa_id=&page=&per_page=
// Sin `estado` el backend lista solo finalizados (cerrado/cancelado).
export async function getHistorialComandas(
    filtros: FiltrosHistorialComandas = {},
    signal?: AbortSignal,
): Promise<PaginaHistorial> {
    const response = await fetch(`${API_BASE_URL}/historial/comandas${armarQuery(filtros)}`, {
        headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${getToken()}`,
        },
        signal,
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) {
        throw new Error(mensajeErrorApi(response.status, data, `Error ${response.status} al obtener el historial de comandas`))
    }
    return normalizarPagina(data as PaginaJSON | null)
}

// GET /historial/comandas/{id} — comanda única (extravíos); 404 con
// "Comanda no encontrada".
export async function getComandaHistorial(id: number, signal?: AbortSignal): Promise<ComandaHistorial> {
    const response = await fetch(`${API_BASE_URL}/historial/comandas/${id}`, {
        headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${getToken()}`,
        },
        signal,
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) {
        throw new Error(mensajeErrorApi(response.status, data, `Error ${response.status} al obtener la comanda`))
    }
    if (!data || typeof data !== 'object') {
        throw new Error('No se encontró la comanda')
    }
    return normalizarComanda(data as ComandaJSON)
}
