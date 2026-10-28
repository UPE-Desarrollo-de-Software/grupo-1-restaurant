// GET /dashboard (permiso ver_dashboard): forma de la respuesta de
// ObtenerDashboardUseCase → ReporteService::dashboard().
export interface DashboardDatos {
  periodo: {
    desde: string
    hasta: string
  }
  ventas: {
    cantidad_pedidos: number
    total: number
    ticket_promedio: number
  }
  pedidos_por_estado: Record<string, number>
  platos_mas_vendidos: {
    plato_id: number
    nombre: string
    unidades: number
    total: number
  }[]
  ocupacion_actual: {
    mesas: {
      total: number
    }
    cubiertos_ocupados: number
    aforo: number
    porcentaje_aforo: number
  }
  reservas_hoy: {
    fecha: string
    pendientes: number
    canceladas: number
    finalizadas: number
    no_asistio: number
    total_personas_pendientes: number
  }
}
