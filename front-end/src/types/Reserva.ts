import z from "zod";
import type { reservaSchema } from "../schemas/reserva";
import type { Mesa } from "./Mesa";

// DER v3.0: pendiente | cancelada | finalizada | no_asistio.
export type EstadoReserva = 'pendiente' | 'cancelada' | 'finalizada' | 'no_asistio'

export interface Reserva {
    id: number
    mesa_id: number
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

// GET /cliente/reservas/mesas — mapa de elección estilo cine: SOLO
// id/capacidad/estado (el codigo_acceso nunca sale en ruta pública).
export interface MesaReservaWeb {
    id: number
    capacidad: number
    estado: string
}

// POST /cliente/reservas — alta; sin mesa_id el sistema crea la mesa
// como "mozo virtual" validando el aforo.
export interface ReservaWebAlta {
    mesa_id?: number
    contacto_solicitante: string
    fecha: string
    hora: string
    cantPersonas: number
}
