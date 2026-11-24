import type { EntradaVisita, VisitaCliente } from '../types/Cliente'

// Estado del comensal guardado POR VISITA (una entrada por `mesa.id`).
// Es independiente de `gastro_cliente`: "Salir de mesa" borra la sesión
// activa pero conserva esta entrada, así al reingresar con el mismo código
// se recuperan los pedidoIds (para "Tu parte") y el borrador sin enviar.
const CLAVE_STORAGE = 'gastro_cliente_visitas'

// Una visita dura horas: pasado un día la entrada ya no sirve y sólo
// ocuparía espacio (el código de 6 dígitos puede reutilizarse en otra mesa).
const VIGENCIA_MS = 24 * 60 * 60 * 1000
const MAXIMO_VISITAS = 10

type MapaVisitas = Record<string, EntradaVisita>

function esEntrada(valor: unknown): valor is EntradaVisita {
    if (typeof valor !== 'object' || valor === null) return false
    const datos = valor as Partial<EntradaVisita>
    return Array.isArray(datos.pedidoIds)
        && Array.isArray(datos.borrador)
        && typeof datos.confirmarPendiente === 'boolean'
        && typeof datos.actualizado === 'number'
}

function leerMapa(): MapaVisitas {
    try {
        const raw = localStorage.getItem(CLAVE_STORAGE)
        if (!raw) return {}
        const datos = JSON.parse(raw) as Record<string, unknown>
        if (typeof datos !== 'object' || datos === null) return {}
        const mapa: MapaVisitas = {}
        for (const [clave, valor] of Object.entries(datos)) {
            if (esEntrada(valor)) mapa[clave] = valor
        }
        return mapa
    } catch {
        return {}
    }
}

function escribirMapa(mapa: MapaVisitas): void {
    try {
        if (Object.keys(mapa).length === 0) {
            localStorage.removeItem(CLAVE_STORAGE)
        } else {
            localStorage.setItem(CLAVE_STORAGE, JSON.stringify(mapa))
        }
    } catch {
        // Sin localStorage (modo privado o cuota llena): se pierde la
        // recuperación al salir, pero la sesión activa sigue funcionando.
    }
}

function vigente(entrada: EntradaVisita): boolean {
    return Date.now() - entrada.actualizado <= VIGENCIA_MS
}

// Sólo los campos que se persisten por visita: la mesa queda afuera.
// Acepta tanto la sesión activa como una entrada ya guardada.
export function datosVisita(valor: VisitaCliente): VisitaCliente {
    return {
        pedidoIds: valor.pedidoIds,
        confirmarPendiente: valor.confirmarPendiente,
        borrador: valor.borrador,
    }
}

// Devuelve la entrada de la visita o `null` (vencida o inexistente).
export function leerVisita(mesaId: number): VisitaCliente | null {
    const mapa = leerMapa()
    const clave = String(mesaId)
    const entrada = mapa[clave]
    if (!entrada) return null
    if (!vigente(entrada)) {
        delete mapa[clave]
        escribirMapa(mapa)
        return null
    }
    return datosVisita(entrada)
}

// Escribe la visita y poda: descarta las vencidas y deja las 10 más
// recientes (una por mesa en curso).
export function guardarVisita(mesaId: number, visita: VisitaCliente): void {
    const mapa = leerMapa()
    for (const [clave, entrada] of Object.entries(mapa)) {
        if (!vigente(entrada)) delete mapa[clave]
    }
    mapa[String(mesaId)] = { ...visita, actualizado: Date.now() }
    const recientes = Object.entries(mapa)
        .sort(([, a], [, b]) => b.actualizado - a.actualizado)
        .slice(0, MAXIMO_VISITAS)
    escribirMapa(Object.fromEntries(recientes))
}

// Se llama cuando el código dejó de valer (401/403): la visita se cerró.
export function descartarVisita(mesaId: number): void {
    const mapa = leerMapa()
    const clave = String(mesaId)
    if (!(clave in mapa)) return
    delete mapa[clave]
    escribirMapa(mapa)
}