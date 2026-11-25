import { API_BASE_URL } from "../config/env"
import { getToken } from "./auth"
import { mensajeErrorApi } from "./error"
import type { DashboardDatos } from "../types/Dashboard"

export interface RangoDashboard {
    desde: string
    hasta: string
}

// GET /dashboard?desde=&hasta= — el backend valida el rango (coherente y
// acotado en días). Los números ya vienen casteados/roundeados en el
// service, pero se pasan por Number() una única vez acá (capa de API),
// por si un decimal llega como string.
export async function getDashboard({ desde, hasta }: RangoDashboard, signal?: AbortSignal): Promise<DashboardDatos> {
    const params = new URLSearchParams({ desde, hasta })
    const response = await fetch(`${API_BASE_URL}/dashboard?${params}`, {
        headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${getToken()}`,
        },
        signal,
    })

    const data = await response.json().catch(() => null)
    if (!response.ok) {
        throw new Error(mensajeErrorApi(response.status, data, `Error ${response.status} al obtener el dashboard`))
    }
    if (!data || typeof data !== 'object' || !('ventas' in data)) {
        throw new Error(data?.message ?? 'No se encontraron datos del dashboard')
    }

    const datos = data as DashboardDatos
    const ocupacion = datos.ocupacion_actual
    return {
        ...datos,
        ventas: {
            cantidad_pedidos: Number(datos.ventas.cantidad_pedidos),
            total: Number(datos.ventas.total),
            ticket_promedio: Number(datos.ventas.ticket_promedio),
        },
        cobros: {
            efectivo: {
                cantidad: Number(datos.cobros?.efectivo?.cantidad ?? 0),
                total: Number(datos.cobros?.efectivo?.total ?? 0),
            },
            mercado_pago: {
                cantidad: Number(datos.cobros?.mercado_pago?.cantidad ?? 0),
                total: Number(datos.cobros?.mercado_pago?.total ?? 0),
            },
        },
        pedidos_por_estado: Object.fromEntries(
            Object.entries(datos.pedidos_por_estado ?? {}).map(([estado, cantidad]) => [estado, Number(cantidad)])
        ),
        platos_mas_vendidos: (datos.platos_mas_vendidos ?? []).map(fila => ({
            ...fila,
            unidades: Number(fila.unidades),
            total: Number(fila.total),
        })),
        categorias_mas_vendidas: (datos.categorias_mas_vendidas ?? []).map(fila => ({
            ...fila,
            categoria_id: Number(fila.categoria_id),
            unidades: Number(fila.unidades),
            total: Number(fila.total),
        })),
        ocupacion_actual: {
            mesas: {
                total: Number(ocupacion.mesas.total),
            },
            cubiertos_ocupados: Number(ocupacion.cubiertos_ocupados),
            aforo: Number(ocupacion.aforo),
            porcentaje_aforo: Number(ocupacion.porcentaje_aforo),
        },
        reservas_hoy: {
            ...datos.reservas_hoy,
            pendientes: Number(datos.reservas_hoy.pendientes),
            canceladas: Number(datos.reservas_hoy.canceladas),
            finalizadas: Number(datos.reservas_hoy.finalizadas),
            no_asistio: Number(datos.reservas_hoy.no_asistio),
            total_personas_pendientes: Number(datos.reservas_hoy.total_personas_pendientes),
        },
    }
}