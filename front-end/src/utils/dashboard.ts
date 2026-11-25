import type { CobrosPorMedio } from '../types/Dashboard'
import type { EstadoReserva, Reserva } from '../types/Reserva'

// ============ PERÍODO ============

export type PeriodoId = 'hoy' | '7d' | '30d' | 'mes'

export interface RangoPeriodo {
    desde: string
    hasta: string
}

export const OPCIONES_PERIODO: { id: PeriodoId; label: string }[] = [
    { id: 'hoy', label: 'Hoy' },
    { id: '7d', label: '7 días' },
    { id: '30d', label: '30 días' },
    { id: 'mes', label: 'Este mes' },
]

const dosDigitos = (valor: number): string => String(valor).padStart(2, '0')

// Y-m-d en hora LOCAL: toISOString() corre al día anterior/siguiente
// según el huso horario y desalinea el período con el backend.
export function fechaLocalISO(ahora = new Date()): string {
    return `${ahora.getFullYear()}-${dosDigitos(ahora.getMonth() + 1)}-${dosDigitos(ahora.getDate())}`
}

function parseFechaLocal(valor: string): Date {
    const [anio, mes, dia] = valor.split('-').map(Number)
    return new Date(anio, (mes ?? 1) - 1, dia ?? 1)
}

function sumarDias(fecha: Date, dias: number): Date {
    return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() + dias)
}

// '7d' y '30d' incluyen hoy: 7 días = hoy−6 .. hoy.
export function rangoDePeriodo(id: PeriodoId, ahora = new Date()): RangoPeriodo {
    const hoy = fechaLocalISO(ahora)

    switch (id) {
        case 'hoy':
            return { desde: hoy, hasta: hoy }
        case '7d':
            return { desde: fechaLocalISO(sumarDias(ahora, -6)), hasta: hoy }
        case '30d':
            return { desde: fechaLocalISO(sumarDias(ahora, -29)), hasta: hoy }
        case 'mes':
            return {
                desde: `${ahora.getFullYear()}-${dosDigitos(ahora.getMonth() + 1)}-01`,
                hasta: hoy,
            }
    }
}

// Mismo largo inmediatamente anterior al rango (para la comparación).
export function rangoAnterior({ desde, hasta }: RangoPeriodo): RangoPeriodo {
    const inicio = parseFechaLocal(desde)
    const fin = parseFechaLocal(hasta)
    const dias = Math.round((fin.getTime() - inicio.getTime()) / 86_400_000) + 1

    return {
        desde: fechaLocalISO(sumarDias(inicio, -dias)),
        hasta: fechaLocalISO(sumarDias(inicio, -1)),
    }
}

// Variación porcentual contra el período anterior. `null` cuando no hay
// base de comparación (período anterior en 0): mostrar 0 % mentiría.
export function variacionPct(actual: number, anterior: number): number | null {
    if (!Number.isFinite(anterior) || anterior <= 0) return null
    return ((actual - anterior) * 100) / anterior
}

// ============ FORMATO ============

export function formatearMonto(monto: number): string {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0,
    }).format(monto)
}

export function formatearNumero(valor: number): string {
    return new Intl.NumberFormat('es-AR').format(valor)
}

export function formatearPorcentaje(valor: number, decimales = 0): string {
    return `${new Intl.NumberFormat('es-AR', { maximumFractionDigits: decimales }).format(valor)} %`
}

export function formatearVariacion(pct: number | null): string {
    if (pct === null) return 'Sin datos previos'
    const signo = pct > 0 ? '+' : ''
    return `${signo}${formatearPorcentaje(pct, 1)}`
}

// dd/mm a partir de un Y-m-d (sin pasar por Date: se evita el huso).
export function formatearFechaCorta(iso: string): string {
    const [, mes, dia] = iso.split('-')
    if (!mes || !dia) return iso
    return `${dia}/${mes}`
}

export function etiquetaRango({ desde, hasta }: RangoPeriodo): string {
    if (desde === hasta) return formatearFechaCorta(desde)
    return `${formatearFechaCorta(desde)} al ${formatearFechaCorta(hasta)}`
}

// ============ COBROS ============

export interface DesgloseCobros {
    total: number
    cantidad: number
    efectivo: { cantidad: number; total: number; porcentaje: number }
    mercadoPago: { cantidad: number; total: number; porcentaje: number }
}

export function calcularCobros(cobros: CobrosPorMedio): DesgloseCobros {
    const total = cobros.efectivo.total + cobros.mercado_pago.total
    const cantidad = cobros.efectivo.cantidad + cobros.mercado_pago.cantidad
    const porcentaje = (monto: number): number => (total > 0 ? (monto * 100) / total : 0)

    return {
        total,
        cantidad,
        efectivo: {
            cantidad: cobros.efectivo.cantidad,
            total: cobros.efectivo.total,
            porcentaje: porcentaje(cobros.efectivo.total),
        },
        mercadoPago: {
            cantidad: cobros.mercado_pago.cantidad,
            total: cobros.mercado_pago.total,
            porcentaje: porcentaje(cobros.mercado_pago.total),
        },
    }
}

// ============ RESERVAS ============

export const ETIQUETAS_RESERVA: Record<EstadoReserva, string> = {
    pendiente: 'Pendientes',
    finalizada: 'Finalizadas',
    cancelada: 'Canceladas',
    no_asistio: 'No asistió',
}

export interface ResumenReservas {
    pendiente: number
    finalizada: number
    cancelada: number
    no_asistio: number
    total: number
}

// `GET /reservas` no acepta rango de fechas (solo fecha exacta): se baja
// el listado una vez y se filtra acá por `reserva.fecha` (Y-m-d).
export function agruparReservasPorEstado(reservas: Reserva[], rango: RangoPeriodo): ResumenReservas {
    const resumen: ResumenReservas = {
        pendiente: 0,
        finalizada: 0,
        cancelada: 0,
        no_asistio: 0,
        total: 0,
    }

    for (const reserva of reservas) {
        if (reserva.fecha < rango.desde || reserva.fecha > rango.hasta) continue
        resumen[reserva.estado] += 1
        resumen.total += 1
    }

    return resumen
}

export function tasaNoShow(resumen: ResumenReservas): number {
    return resumen.total > 0 ? (resumen.no_asistio * 100) / resumen.total : 0
}

// ============ PALETA (categorías del donut) ============

// Derivada de los design tokens existentes (primary, secondary,
// tertiary y sus contenedores). Recharts necesita colores concretos.
export const COLORES_CATEGORIA = [
    '#9f3c16', // primary
    '#4c6450', // secondary
    '#815215', // tertiary
    '#bf542c', // primary-container
    '#9d6a2c', // tertiary-container
    '#526a56', // on-secondary-container
    '#8a726a', // outline
    '#ffb59c', // inverse-primary
]

export function colorCategoria(indice: number): string {
    return COLORES_CATEGORIA[indice % COLORES_CATEGORIA.length]
}