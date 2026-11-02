import type { LineaCocina, PedidoCocina } from '../types/Mesa'
import type { PlatoObtener } from '../types/Menu'

// Utilidades puras de la cola de cocina. El backend manda `fecha` como
// "YYYY-MM-DD HH:mm:ss" (sin zona horaria): se parsea como hora local
// para no correr el reloj. La hora de referencia de una comanda es su
// `fecha` de creación (no hay timestamp de envío).

const ETIQUETAS_ESTADO: Record<string, string> = {
    en_curso: 'En curso',
    confirmado: 'Confirmado',
    enviado: 'Para preparar',
    en_preparacion: 'En preparación',
    listo: 'Listo',
    entregado: 'Entregado',
    cerrado: 'Cerrado',
    cancelado: 'Cancelado',
}

export function etiquetaEstado(estado: string): string {
    return ETIQUETAS_ESTADO[estado] ?? estado.replace(/_/g, ' ')
}

export function parseFechaPedido(fecha: string): Date | null {
    if (!fecha) return null
    const normalizada = fecha.includes('T') ? fecha : fecha.replace(' ', 'T')
    const date = new Date(normalizada)
    return Number.isNaN(date.getTime()) ? null : date
}

export function formatearHora(fecha: string): string {
    const date = parseFechaPedido(fecha)
    if (!date) return '—'
    return new Intl.DateTimeFormat('es-AR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).format(date)
}

export function tiempoTranscurrido(fecha: string, ahora: Date): string {
    const date = parseFechaPedido(fecha)
    if (!date) return ''
    const minutos = Math.max(0, Math.floor((ahora.getTime() - date.getTime()) / 60_000))
    if (minutos < 1) return 'recién'
    if (minutos < 60) return `hace ${minutos} min`
    const horas = Math.floor(minutos / 60)
    if (horas < 24) {
        const resto = minutos % 60
        return resto === 0 ? `hace ${horas} h` : `hace ${horas} h ${resto} min`
    }
    const dias = Math.floor(horas / 24)
    return dias === 1 ? 'hace 1 día' : `hace ${dias} días`
}

export function contarProductos(pedido: PedidoCocina): number {
    return pedido.lineas.reduce((total, linea) => total + linea.cantidad, 0)
}

// Orden de llegada: más antigua primero; desempate estable por id (el
// backend ya viene por id ascendente, pero la fecha manda).
export function ordenarPorLlegada(pedidos: PedidoCocina[]): PedidoCocina[] {
    return [...pedidos].sort((a, b) => {
        const fechaA = parseFechaPedido(a.fecha)?.getTime() ?? 0
        const fechaB = parseFechaPedido(b.fecha)?.getTime() ?? 0
        if (fechaA !== fechaB) return fechaA - fechaB
        return a.id - b.id
    })
}

// ==== Composición final de una línea ====
// La receta del plato NO viene en GET /cocina/pedidos: se pide aparte con
// GET /platos/{id} (receta vigente). Acá se combina esa receta con las
// excepciones guardadas en el pedido para mostrar sólo lo que va al plato:
//
//   por_defecto + !opcional  → obligatorio (siempre)
//   por_defecto +  opcional  → por defecto (si no está excluido)
//  !por_defecto +  opcional  → opcional (sólo si está agregado)
//  !por_defecto + !opcional  → no incluir (nunca)

export type EstadoIngredienteComposicion = 'obligatorio' | 'por_defecto' | 'extra'

export interface IngredienteComposicion {
    id: number
    nombre: string
    estado: EstadoIngredienteComposicion
}

export const ETIQUETAS_COMPOSICION: Record<EstadoIngredienteComposicion, string> = {
    obligatorio: 'Obligatorio',
    por_defecto: 'Por defecto',
    extra: 'Extra',
}

export function composicionLinea(
    linea: LineaCocina,
    receta: PlatoObtener | undefined,
): IngredienteComposicion[] {
    const excluidos = new Set(
        linea.personalizaciones
            .filter(p => p.tipo === 'excluido')
            .map(p => p.ingrediente_id),
    )
    const agregados = new Map(
        linea.personalizaciones
            .filter(p => p.tipo === 'agregado')
            .map(p => [p.ingrediente_id, p.nombre] as const),
    )

    const composicion: IngredienteComposicion[] = []
    const vistos = new Set<number>()

    for (const ingrediente of receta?.ingredientes ?? []) {
        const { opcional, por_defecto } = ingrediente.pivot
        if (!por_defecto && !opcional) continue

        if (por_defecto && !opcional) {
            composicion.push({ id: ingrediente.id, nombre: ingrediente.nombre, estado: 'obligatorio' })
            vistos.add(ingrediente.id)
            continue
        }

        if (por_defecto) {
            if (!excluidos.has(ingrediente.id)) {
                composicion.push({ id: ingrediente.id, nombre: ingrediente.nombre, estado: 'por_defecto' })
                vistos.add(ingrediente.id)
            }
            continue
        }

        if (agregados.has(ingrediente.id)) {
            composicion.push({ id: ingrediente.id, nombre: ingrediente.nombre, estado: 'extra' })
            vistos.add(ingrediente.id)
        }
    }

    // Extras registrados que la receta vigente ya no lista: no se pierden.
    for (const [id, nombre] of agregados) {
        if (!vistos.has(id)) {
            composicion.push({ id, nombre, estado: 'extra' })
        }
    }

    return composicion
}

export function ingredientesExcluidos(linea: LineaCocina): string[] {
    return linea.personalizaciones
        .filter(p => p.tipo === 'excluido')
        .map(p => p.nombre)
}
