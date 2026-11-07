import { z } from "zod";

// Filas del editor de CONFIG_MESA (PUT /configuracion, replace-all):
// capacidad y cantidad enteras ≥ 1. La regla "no bajar el aforo ni el
// tope de mesas por debajo de las mesas vivas" es del backend (422) y
// llega como mensaje. `capacidad`/`cantidad` llegan del form como string.
export const configMesaFilaSchema = z.object({
    capacidad: z.preprocess(
        (valor) => (valor === '' || valor === undefined ? undefined : valor),
        z.coerce.number({ error: "Ingresá la capacidad" })
            .int("La capacidad debe ser un número entero")
            .min(1, "La capacidad mínima es 1")
    ),
    cantidad: z.preprocess(
        (valor) => (valor === '' || valor === undefined ? undefined : valor),
        z.coerce.number({ error: "Ingresá la cantidad" })
            .int("La cantidad debe ser un número entero")
            .min(1, "La cantidad mínima es 1")
    ),
})

export const configMesasSchema = z.array(configMesaFilaSchema)
    .min(1, "Definí al menos una fila de mesas")

export type ConfigMesaFilaInput = z.infer<typeof configMesaFilaSchema>
