import type { EstadoVisitaMesa, Mesa } from '../types/Mesa'

// Utilidades puras de las cards/resumen de mesas (Diseño 2.0). El
// estado VISIBLE de la visita lo deriva el backend a partir de los
// pedidos de la mesa y viaja en `mesa.resumen`; acá solo se traduce a
// etiquetas y se cuenta para el resumen del hub.
// Vive en utils/ por la regla react-refresh/only-export-components.

export const ETIQUETAS_ESTADO_VISITA: Record<EstadoVisitaMesa, string> = {
    eligiendo: 'Eligiendo',
    en_cocina: 'En cocina',
    listo: 'Listo',
    servido: 'Servido',
}

// El resumen del hub cuenta mesas por estado: ahí van en plural.
export const ETIQUETAS_ESTADO_VISITA_PLURAL: Record<EstadoVisitaMesa, string> = {
    eligiendo: 'Eligiendo',
    en_cocina: 'En cocina',
    listo: 'Listos',
    servido: 'Servidos',
}

// Orden de los indicadores del resumen (mismo recorrido que la visita).
// `eligiendo` queda fuera a propósito: el resumen cuenta solo las visitas
// que ya están en el circuito (en cocina, listas, servidas). Una mesa
// recién creada o con pedidos sin enviar no suma en ningún indicador
// (igual se ve en la lista, con "Sin pedidos todavía").
export const ORDEN_ESTADOS_VISITA: EstadoVisitaMesa[] = [
    'en_cocina',
    'listo',
    'servido',
]

export const ESTADO_VISITA_POR_DEFECTO: EstadoVisitaMesa = 'eligiendo'

// Sin `resumen` (respuestas que no son el listado) se asume que la
// visita todavía está armando el pedido.
export function estadoVisitaDeMesa(mesa: Mesa): EstadoVisitaMesa {
    return mesa.resumen?.estado_pedido ?? ESTADO_VISITA_POR_DEFECTO
}

export function contarMesasPorEstado(mesas: Mesa[]): Record<EstadoVisitaMesa, number> {
    const conteo: Record<EstadoVisitaMesa, number> = {
        eligiendo: 0,
        en_cocina: 0,
        listo: 0,
        servido: 0,
    }

    for (const mesa of mesas) {
        conteo[estadoVisitaDeMesa(mesa)] += 1
    }

    return conteo
}
