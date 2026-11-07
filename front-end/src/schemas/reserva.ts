import { z } from "zod";

// Espejo del validate de ReservaController::store (contacto, fecha,
// hora en formato HH:mm y al menos 1 persona). NO hay mesa que elegir:
// el backend asigna una combinación de capacidades del CONFIG_MESA.
// Las reglas de negocio (lead time, aforo insuficiente o conflicto
// horario) las valida el backend y llegan como 422.
export const reservaSchema = z.object({
    contacto_solicitante: z.string().trim().min(1, "Ingresá el contacto del solicitante"),
    fecha: z.iso.date({ error: "Ingresá una fecha válida" }),
    hora: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Ingresá una hora válida"),
    cantPersonas: z.coerce.number({ error: "Ingresá la cantidad de personas" })
        .int("La cantidad debe ser un número entero")
        .min(1, "Debe ser al menos 1 persona"),
})
