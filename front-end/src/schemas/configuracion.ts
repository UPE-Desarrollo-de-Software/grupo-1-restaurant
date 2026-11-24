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

// Ventana de turnos de reservas (PUT /configuracion/disponibilidad).
// `hora_inicio`/`hora_fin` llegan del input type="time" como 'HH:MM' y el
// intervalo es uno de los que admite el backend (INTERVALOS_VALIDOS).
// El backend vuelve a validar todo: acá sólo se evita el viaje inútil.
// `anticipacion_horas` no se edita (sólo lo informa el GET).
export const disponibilidadReservaSchema = z.object({
    hora_inicio: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Elegí la hora de apertura"),
    hora_fin: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Elegí la hora de cierre"),
    intervalo_minutos: z.coerce.number({ error: "Elegí el intervalo entre turnos" })
        .int("El intervalo debe ser un número entero")
        .refine(valor => [15, 30, 45, 60].includes(valor), {
            error: "El intervalo debe ser 15, 30, 45 o 60 minutos",
        }),
}).refine(datos => datos.hora_fin > datos.hora_inicio, {
    error: "La hora de cierre debe ser posterior a la de apertura",
    path: ["hora_fin"],
})

export type DisponibilidadReservaInput = z.infer<typeof disponibilidadReservaSchema>
