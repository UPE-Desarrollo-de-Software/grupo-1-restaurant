import {z} from "zod";

export const platoSchema = z.object({
    categoria_id: z.coerce.number().positive('Seleccioná una categoría'),
    nombre: z.string().trim().min(1, "Ingresá un nombre"),
    descripcion: z.string().trim(),
    precio: z.coerce.number().positive("El precio debe ser positivo"),
    imagen: z.string().trim(),
    disponible: z.boolean(),
    ingredientes: z.array(z.number().int().min(1, 'ID de ingrediente inválido')).optional()
        .transform(ids => ids?.map(ingrediente_id => ({ ingrediente_id })))
})

export const categoriaSchema = z.object({
    nombre: z.string().trim().min(1, "Ingresá un nombre"),
    descripcion: z.string().trim().min(1, "Ingresá una descripción"),
    activo: z.boolean()
})

export const ingredienteSchema = z.object({
    nombre: z.string().trim().min(1, "Ingresá un nombre"),
    precioAdicional: z.preprocess(
        (valor) => (valor === '' ? undefined : valor),
        z.coerce.number({ error: "Ingresá un precio" })
            .min(0, "El precio no puede ser negativo")
    ),
})