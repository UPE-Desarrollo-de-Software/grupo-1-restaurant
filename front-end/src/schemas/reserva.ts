import { z } from "zod";

// Espejo del validate de ReservaController::store (mesa obligatoria,
// hora en formato HH:mm y al menos 1 persona). Las reglas de negocio
// (lead time, capacidad y conflicto horario) las valida el backend y
// llegan como 422.
export const reservaSchema = z.object({
    mesa_id: z.coerce.number({ error: "Seleccioná una mesa" })
        .min(1, "Seleccioná una mesa"),
    contacto_solicitante: z.string().trim().min(1, "Ingresá el contacto del solicitante"),
    fecha: z.iso.date({ error: "Ingresá una fecha válida" }),
    hora: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Ingresá una hora válida"),
    cantPersonas: z.coerce.number({ error: "Ingresá la cantidad de personas" })
        .int("La cantidad debe ser un número entero")
        .min(1, "Debe ser al menos 1 persona"),
})
