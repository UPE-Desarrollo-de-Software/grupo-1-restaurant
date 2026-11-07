import {z} from "zod";

export const platoSchema = z.object({
    categoria_id: z.coerce.number().positive('Seleccioná una categoría'),
    // 'Sin promoción' llega como '' → null; si la key no viene (el form
    // de edición no la arma) el output la omite y el PUT no toca la FK.
    promocion_id: z.preprocess(
        (valor) => (valor === '' ? null : valor),
        z.coerce.number().positive().nullable().optional()
    ),
    nombre: z.string().trim().min(1, "Ingresá un nombre"),
    descripcion: z.string().trim(),
    precio: z.coerce.number().positive("El precio debe ser positivo"),
    imagen: z.string().trim(),
    disponible: z.boolean(),
    // La API acepta ids sueltos (`[1, 2]`, flags default) u objetos con los flags
    // del pivot (`opcional` / `por_defecto`). El form manda ids; al editar se
    // reenvían los flags originales para no resetearlos.
    ingredientes: z.array(
        z.union([
            z.number().int().min(1, 'ID de ingrediente inválido'),
            z.object({
                ingrediente_id: z.number().int().min(1, 'ID de ingrediente inválido'),
                opcional: z.boolean().optional(),
                por_defecto: z.boolean().optional(),
            }),
        ])
    ).optional()
        .transform(lista => lista?.map(item =>
            typeof item === 'number' ? { ingrediente_id: item } : item
        ))
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

// Espejo de las reglas del backend (PromocionService → 422): 2x1 sin
// valor, porcentaje 1-100, valores no negativos y ventana de fechas
// coherente. `valor` llega del form como string ('' = sin valor).
export const promocionSchema = z.object({
    nombre: z.string().trim().min(1, "Ingresá un nombre"),
    tipo: z.enum(['porcentaje', 'monto_fijo', 'precio_fijo', '2x1'], {
        error: "Seleccioná un tipo",
    }),
    valor: z.preprocess(
        (valor) => (valor === '' || valor === undefined ? null : valor),
        z.coerce.number({ error: "Ingresá un valor" })
            .min(0, "El valor no puede ser negativo")
            .nullable()
    ),
    fecha_inicio: z.preprocess(
        (fecha) => (fecha === '' || fecha === undefined ? null : fecha),
        z.string().nullable()
    ),
    fecha_fin: z.preprocess(
        (fecha) => (fecha === '' || fecha === undefined ? null : fecha),
        z.string().nullable()
    ),
    activo: z.boolean(),
}).superRefine((datos, ctx) => {
    if (datos.tipo !== '2x1') {
        if (datos.valor === null) {
            ctx.addIssue({ code: 'custom', path: ['valor'], message: 'Este tipo de promo requiere un valor' })
        } else if (datos.tipo === 'porcentaje' && (datos.valor <= 0 || datos.valor > 100)) {
            ctx.addIssue({ code: 'custom', path: ['valor'], message: 'El porcentaje debe estar entre 1 y 100' })
        }
    }
    if (datos.fecha_inicio && datos.fecha_fin && datos.fecha_fin < datos.fecha_inicio) {
        ctx.addIssue({ code: 'custom', path: ['fecha_fin'], message: 'La fecha fin debe ser posterior a la fecha inicio' })
    }
}).transform(datos => ({
    ...datos,
    // El backend anula el valor de los 2x1 en el service.
    valor: datos.tipo === '2x1' ? null : datos.valor,
}))