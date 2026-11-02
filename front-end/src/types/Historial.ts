// Shapes espejo de ReporteService::comandaAArray() (historial de
// comandas). La capa de API normaliza los números UNA sola vez; acá los
// tipos ya son de dominio. `codigo_acceso` viene en la respuesta del
// backend pero no se tipa ni se mapea: jamás se renderiza.

import type { EstadoPedido, PromocionLinea } from './Mesa'

export interface LineaComandaHistorial {
    detalle_id: number
    plato_id: number
    plato: string
    cantidad: number
    precio_lista: number
    subtotal: number
    promocion: PromocionLinea | null
    confirmado: boolean
}

export interface MesaComandaHistorial {
    id: number
    capacidad: number
    destruida: boolean
}

export interface ComandaHistorial {
    id: number
    pedido_padre_id: number | null
    estado: EstadoPedido
    total: number
    fecha: string
    mesa: MesaComandaHistorial | null
    lineas: LineaComandaHistorial[]
}

export interface FiltrosHistorialComandas {
    // Fechas Y-m-d (día: desde = hasta; mes: primer/último día).
    desde?: string
    hasta?: string
    estado?: EstadoPedido
    mesa_id?: number
    page?: number
    // Default 20 en el backend; máximo 100.
    per_page?: number
}

// Paginador de Laravel normalizado (solo los campos que consume la UI).
export interface PaginaHistorial {
    data: ComandaHistorial[]
    current_page: number
    last_page: number
    per_page: number
    total: number
    from: number | null
    to: number | null
}
