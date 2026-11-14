import type { SlotDisponibilidad } from '../types/Reserva'

// Anticipación (en horas) que usa el front SÓLO si el backend no manda el
// dato (caso: front desplegado antes que el back). El valor real viaja en
// GET /cliente/reservas/disponibilidad-dia → `horarios.anticipacion_horas`,
// que sale de la configuración centralizada del backend. No es una regla
// propia del front.
export const ANTICIPACION_HORAS_POR_DEFECTO = 2

/**
 * Instante del turno en hora local. `null` si fecha/hora no parsean.
 */
export function momentoSlot(fecha: string, hora: string): Date | null {
    const momento = new Date(`${fecha}T${hora}:00`)
    return Number.isNaN(momento.getTime()) ? null : momento
}

export interface ContextoSlot {
    fecha: string
    // Reloj actual (useAhora).
    horaActual: Date
    // Horas de anticipación que devuelve el backend.
    anticipacionHoras: number
    personasValidas: boolean
    personas: number
}

function horasDeAnticipacion(anticipacionHoras: number): number {
    return Number.isFinite(anticipacionHoras) && anticipacionHoras >= 0
        ? anticipacionHoras
        : ANTICIPACION_HORAS_POR_DEFECTO
}

function textoAnticipacion(horas: number): string {
    if (horas === 1) return 'Falta 1 hora de anticipación'
    return `Faltan ${horas} horas de anticipación`
}

/**
 * Misma regla que el backend (ReservaService::validarLeadTime): se compara
 * el INSTANTE del turno contra `ahora + anticipación`. Comparar sólo los
 * minutos del día (lo que hacía el front antes) habilitaba el turno que
 * arrancaba justo en el límite, que el backend rechaza con 422.
 */
export function fueraDeAnticipacion(slot: SlotDisponibilidad, contexto: ContextoSlot): boolean {
    const momento = momentoSlot(contexto.fecha, slot.hora)
    if (!momento) return false

    const limite = contexto.horaActual.getTime() + horasDeAnticipacion(contexto.anticipacionHoras) * 3_600_000
    return momento.getTime() < limite
}

/**
 * Motivo por el que un turno no se puede elegir (`null` = habilitado).
 * El orden de los motivos es el que ve el usuario en el `title`.
 */
export function motivoDeshabilitado(slot: SlotDisponibilidad, contexto: ContextoSlot): string | null {
    if (fueraDeAnticipacion(slot, contexto)) {
        return textoAnticipacion(horasDeAnticipacion(contexto.anticipacionHoras))
    }

    if (!contexto.personasValidas) {
        return 'Indicá cuántas personas son'
    }

    if (slot.aforo_disponible < contexto.personas) {
        return 'Sin lugar para esa cantidad de personas'
    }

    return null
}

function minutosDeHora(hora: string): number | null {
    const coincidencia = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hora)
    if (!coincidencia) return null
    return Number(coincidencia[1]) * 60 + Number(coincidencia[2])
}

function horaDeMinutos(minutos: number): string {
    const horas = Math.floor(minutos / 60)
    const resto = minutos % 60
    return `${String(horas).padStart(2, '0')}:${String(resto).padStart(2, '0')}`
}

/**
 * Grilla de turnos que se derivaría de una ventana, con la MISMA regla
 * del backend (inicio y fin inclusive). Se usa sólo para la vista previa
 * del panel; la grilla real siempre la devuelve la API.
 */
export function generarTurnos(horaInicio: string, horaFin: string, intervaloMinutos: number): string[] {
    const inicio = minutosDeHora(horaInicio)
    const fin = minutosDeHora(horaFin)

    if (inicio === null || fin === null || !Number.isFinite(intervaloMinutos) || intervaloMinutos <= 0 || fin <= inicio) {
        return []
    }

    const turnos: string[] = []
    for (let minutos = inicio; minutos <= fin && turnos.length < 96; minutos += intervaloMinutos) {
        turnos.push(horaDeMinutos(minutos))
    }

    return turnos
}
