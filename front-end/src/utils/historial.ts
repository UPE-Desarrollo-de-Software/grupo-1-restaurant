import type { ComandaHistorial, MesaComandaHistorial } from '../types/Historial'
import { parseFechaPedido } from './cocina'

const dosDigitos = (valor: number): string => String(valor).padStart(2, '0')

export function fechaLocal(ahora = new Date()): string {
    return `${ahora.getFullYear()}-${dosDigitos(ahora.getMonth() + 1)}-${dosDigitos(ahora.getDate())}`
}

export function mesLocal(ahora = new Date()): string {
    return `${ahora.getFullYear()}-${dosDigitos(ahora.getMonth() + 1)}`
}

export function rangoDelDia(dia: string): { desde: string; hasta: string } | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) return null
    return { desde: dia, hasta: dia }
}

export function rangoDelMes(mes: string): { desde: string; hasta: string } | null {
    const coincidencia = /^(\d{4})-(\d{2})$/.exec(mes)
    if (!coincidencia) return null

    const anio = Number(coincidencia[1])
    const numeroMes = Number(coincidencia[2])
    if (numeroMes < 1 || numeroMes > 12) return null

    const ultimoDia = new Date(anio, numeroMes, 0).getDate()
    return {
        desde: `${mes}-01`,
        hasta: `${mes}-${dosDigitos(ultimoDia)}`,
    }
}

export function formatearFechaHora(fecha: string): string {
    const date = parseFechaPedido(fecha)
    if (!date) return '—'
    return new Intl.DateTimeFormat('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).format(date)
}

export function formatearPrecio(precio: number): string {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(precio)
}

export function contarProductosHistorial(comanda: ComandaHistorial): number {
    return comanda.lineas.reduce((total, linea) => total + linea.cantidad, 0)
}

export function etiquetaMesaHistorial(mesa: MesaComandaHistorial | null): string {
    if (!mesa) return 'Mesa no disponible'
    const numero = String(mesa.id).padStart(2, '0')
    return mesa.destruida ? `Mesa #${numero} · cerrada` : `Mesa #${numero}`
}
