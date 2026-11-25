// GET /dashboard (permiso ver_dashboard): forma de la respuesta de
// ObtenerDashboardUseCase → ReporteService::dashboard().

// Cobros APROBADOS del período, desglosados por `medio_pago`. Son una
// cifra DISTINTA de las ventas: ventas usa pedidos.fecha (entregado) y
// cobros usa pagos.fecha (aprobado).
export interface CobroMedio {
  cantidad: number
  total: number
}

export interface CobrosPorMedio {
  efectivo: CobroMedio
  mercado_pago: CobroMedio
}

export interface CategoriaVendida {
  categoria_id: number
  nombre: string
  unidades: number
  total: number
}

export interface PlatoVendido {
  plato_id: number
  nombre: string
  unidades: number
  total: number
}

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
  cobros: CobrosPorMedio
  pedidos_por_estado: Record<string, number>
  platos_mas_vendidos: PlatoVendido[]
  categorias_mas_vendidas: CategoriaVendida[]
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