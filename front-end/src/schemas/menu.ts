import {z} from "zod";

export const productoSchema = z.object({
    categoria_id: z.coerce.number().positive('Seleccioná una categoría'),
    nombre: z.string().trim().min(1, "Ingresá un nombre"),
    descripcion: z.string().trim(),
    precio: z.coerce.number().positive("El precio debe ser positivo"),
    imagen: z.string().trim(),
    disponible: z.boolean(),
    ingredientes: z.array(z.number().int().min(1, 'ID de ingrediente inválido')).optional()
})

export const categoriaSchema = z.object({
    nombre: z.string().trim().min(1, "Ingresá un nombre"),
    descripcion: z.string().trim().min(1, "Ingresá una descripción"),
    activo: z.boolean()
})

export const ingredienteSchema = z.object({
    nombre: z.string().trim().min(1, "Ingresá un nombre"),
    opcional: z.boolean(),
    precioAdicional: z.coerce.number().positive("El precio debe ser positivo")
})