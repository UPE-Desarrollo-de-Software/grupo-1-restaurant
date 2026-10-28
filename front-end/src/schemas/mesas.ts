import {z} from "zod";

// Espejo de las reglas de POST/PUT /mesas (MesaController): capacidad
// entera ≥1 y estado del enum. El aforo total contra el CONFIG_MESA
// (Σ capacidad×cantidad) lo valida el backend (422) y se muestra
// tal cual en la Alert. `capacidad` llega del form como string.
// El alta del flujo del equipo siempre envía estado 'ocupada' (la mesa
// nace con el cliente sentado); la edición conserva el estado vigente.
export const mesaSchema = z.object({
    capacidad: z.preprocess(
        (valor) => (valor === '' || valor === undefined ? undefined : valor),
        z.coerce.number({ error: "Ingresá la capacidad de la mesa" })
            .int("La capacidad debe ser un número entero")
            .min(1, "La capacidad mínima es 1")
    ),
    estado: z.enum(['libre', 'ocupada', 'reservada'], {
        error: "Seleccioná un estado",
    }),
    // '' = sin mozo asignado (el backend acepta null).
    usuario_id: z.preprocess(
        (valor) => (valor === '' || valor === null || valor === undefined ? null : valor),
        z.coerce.number().int().positive().nullable()
    ),
})
