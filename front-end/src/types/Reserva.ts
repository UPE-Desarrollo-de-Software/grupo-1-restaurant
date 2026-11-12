import z from "zod";
import type { reservaSchema } from "../schemas/reserva";
import type { Mesa } from "./Mesa";

// DER v3.0: pendiente | cancelada | finalizada | no_asistio.
export type EstadoReserva = 'pendiente' | 'cancelada' | 'finalizada' | 'no_asistio'

export interface Reserva {
    id: number
    // La reserva ya no elige mesa: el back asigna una combinación de
    // capacidades del CONFIG_MESA y el mozo arma las mesas al llegar
    // el grupo; queda null hasta entonces.
    mesa_id: number | null
    // Viene eager en el listado y el detalle (with('mesa')); el POST la
    // devuelve sin la relación cargada.
    mesa?: Mesa | null
    contacto_solicitante: string
    // El backend manda 'Y-m-d' y 'H:mm[:ss]' como strings (sin casts);
    // la capa API recorta a 'Y-m-d' y 'HH:mm'.
    fecha: string
    hora: string
    cantPersonas: number
    estado: EstadoReserva
    // PIN de 4 dígitos con ceros a la izquierda (ej. "0182") que el
    // cliente presenta al llegar. Lo genera el backend en el alta; es
    // único entre las reservas pendientes (se recicla al finalizar o
    // cancelar). Opcional por compatibilidad con respuestas viejas.
    codigo?: string
}

export type ReservaInput = z.infer<typeof reservaSchema>
export type ReservaResponse = {
    mensaje: string,
    reserva: Reserva
}

// ==== Reserva web del cliente (rutas PÚBLICAS, sin token) ====

// GET /cliente/reservas/disponibilidad-dia?fecha= — grilla fija de
// turnos (12:00–23:00 cada 30 min). Por cada horario, las capacidades
// del CONFIG_MESA que quedan libres en su intervalo (las pendientes que
// solapan hacen hold).
export interface SlotDisponibilidad {
    hora: string
    inicio: string
    fin: string
    disponible: { capacidad: number; cantidad: number }[]
    aforo_disponible: number
}

export interface DisponibilidadDiaReservaWeb {
    fecha: string
    slots: SlotDisponibilidad[]
}

// POST /cliente/reservas — alta; NO hay mesa que elegir: el backend
// asigna la combinación de capacidades del CONFIG_MESA.
export interface ReservaWebAlta {
    contacto_solicitante: string
    fecha: string
    hora: string
    cantPersonas: number
}
