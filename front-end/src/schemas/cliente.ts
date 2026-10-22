import { z } from "zod";

// Código de acceso de la mesa (4 dígitos string, contrato de
// POST /acceso con `size:4`; el backend preserva ceros a la izquierda).
export const codigoMesaSchema = z.object({
    codigo: z.string()
        .regex(/^\d{4}$/, "El código debe tener exactamente 4 dígitos"),
})

export type CodigoMesaInput = z.infer<typeof codigoMesaSchema>

// Fecha de hoy en LOCAL (no UTC): en Argentina, después de las 21 UTC
// el día de `toISOString()` ya es mañana y rechazaría la fecha de hoy.
export function hoyLocal(): string {
    const fecha = new Date()
    return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`
}

// Formulario de solicitud de reserva web → POST /cliente/reservas
// (PÚBLICO con throttle). El backend recibe un único
// `contacto_solicitante`; la capa API arma "Nombre (Tel: ...)" con
// nombre + teléfono del formulario.
export const reservaWebSchema = z.object({
    nombreApellido: z.string().trim().min(3, "Ingresá tu nombre y apellido"),
    telefono: z.string().trim().min(6, "Ingresá un teléfono de contacto"),
    fecha: z.iso.date({ error: "Ingresá una fecha válida" })
        .refine(valor => valor >= hoyLocal(), {
            error: "No podés elegir una fecha pasada",
        }),
    hora: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Ingresá una hora válida"),
    cantPersonas: z.coerce.number({ error: "Indicá cuántas personas son" })
        .int("La cantidad debe ser un número entero")
        .min(1, "Debe ser al menos 1 persona"),
})

export type ReservaWebInput = z.infer<typeof reservaWebSchema>
