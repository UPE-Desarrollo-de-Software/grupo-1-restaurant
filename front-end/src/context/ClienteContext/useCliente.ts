import { createContext, useContext } from 'react'
import type { ClienteMesa, LineaBorrador, OpcionBorrador } from '../../types/Cliente'
import type { ResumenMesa } from '../../types/Mesa'

// Edición de una línea existente del borrador (la clave se recalcula).
export interface CambiosLinea {
    cantidad: number
    ingredientes: number[]
    excluir: number[]
    opciones: Record<number, OpcionBorrador>
}

// Única fuente de verdad del cliente: mesa identificada + borrador
// armado + pedidos enviados por este comensal. La consume el navbar,
// la Carta, Mi pedido y la pantalla de Mesa; se persiste en localStorage
// y se revalida contra el backend al recargar la página.
export interface ContextoCliente {
    mesa: ClienteMesa | null
    mesaIdentificada: boolean
    borrador: LineaBorrador[]
    // Unidades totales del borrador (para el badge del bottom navbar).
    cantidadBorrador: number
    // Total estimado del borrador: Σ (precio + adicionales) × cantidad.
    // El descuento de promos lo calcula el backend al enviar.
    totalBorrador: number
    pedidoIds: number[]
    resumen: ResumenMesa | null
    // true mientras se revalida el código guardado contra el backend.
    revalidando: boolean
    // Identifica la mesa (o refresca la misma); si es otra, la página
    // debe haber confirmado antes el descarte del borrador.
    aplicarIdentificacion(mesa: ClienteMesa): void
    agregarLinea(linea: Omit<LineaBorrador, 'clave'>): void
    editarLinea(clave: string, cambios: CambiosLinea): void
    eliminarLinea(clave: string): void
    cancelarBorrador(): void
    // Enviar = POST /cliente/pedidos (+ anexo si hay pedido en curso) y
    // POST /cliente/pedidos/confirmar. Lanza Error en español si falla y
    // conserva el borrador (o marca la confirmación pendiente de reintentar).
    enviar(): Promise<void>
    // GET /cliente/pedidos → estado.resumen. Lanza ErrorCliente si falla.
    recargarResumen(): Promise<void>
}

export const ContextoCliente = createContext<ContextoCliente | null>(null)

export function useCliente(): ContextoCliente {
    const contexto = useContext(ContextoCliente)
    if (!contexto) {
        throw new Error('useCliente debe usarse dentro de ClienteProvider')
    }
    return contexto
}
