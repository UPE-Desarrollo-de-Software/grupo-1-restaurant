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
}

export type ReservaInput = z.infer<typeof reservaSchema>
export type ReservaResponse = {
    mensaje: string,
    reserva: Reserva
}

// ==== Reserva web del cliente (rutas PÚBLICAS, sin token) ====

// GET /cliente/reservas/disponibilidad?fecha=&hora= — capacidades del
// CONFIG_MESA que quedan libres para el intervalo (las pendientes del
// día que solapan hacen hold). Reemplaza al viejo mapa de elección de
// mesas.
export interface DisponibilidadReservaWeb {
    fecha: string
    inicio: string
    fin: string
    disponible: { capacidad: number; cantidad: number }[]
    aforo_disponible: number
}

// POST /cliente/reservas — alta; NO hay mesa que elegir: el backend
// asigna la combinación de capacidades del CONFIG_MESA.
export interface ReservaWebAlta {
    contacto_solicitante: string
    fecha: string
    hora: string
    cantPersonas: number
}
