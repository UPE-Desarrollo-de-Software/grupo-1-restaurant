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
    // La imagen NO va en el body: se sube aparte con
    // POST /platos/{id}/imagen (multipart) y se quita con el DELETE.
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

// Espejo de las reglas del backend (PlatoService::aumentarPrecios → 422):
// exactamente uno de "todos" / categoría, aumento mayor a 0 y redondeo
// opcional a números lindos (50/100). El form maneja el alcance como un
// único select ('todos' | 'categoria'); acá se transforma al payload que
// espera POST /platos/aumentar-precios.
export const aumentoPreciosSchema = z.object({
    alcance: z.enum(['todos', 'categoria'], {
        error: "Seleccioná el alcance del aumento",
    }),
    categoria_id: z.preprocess(
        (valor) => (valor === '' || valor === undefined || valor === null ? null : valor),
        z.coerce.number().positive('Seleccioná una categoría').nullable()
    ),
    tipo: z.enum(['porcentaje', 'monto'], {
        error: "Seleccioná el tipo de aumento",
    }),
    valor: z.preprocess(
        (valor) => (valor === '' || valor === undefined ? undefined : valor),
        z.coerce.number({ error: "Ingresá un valor" })
            .positive('El aumento debe ser mayor a 0')
    ),
    redondeo: z.preprocess(
        (valor) => (valor === '' || valor === undefined || valor === null ? null : valor),
        z.coerce.number()
            .refine(n => n === 50 || n === 100, { error: "Elegí sin redondeo, 50 o 100" })
            .nullable()
    ),
}).superRefine((datos, ctx) => {
    if (datos.alcance === 'categoria' && datos.categoria_id === null) {
        ctx.addIssue({ code: 'custom', path: ['categoria_id'], message: 'Seleccioná una categoría' })
    }
}).transform(datos => ({
    // El backend exige exactamente uno de los dos; el form solo permite
    // elegirlo, así que la inconsistencia no puede llegar a la API.
    todos: datos.alcance === 'todos',
    categoria_id: datos.alcance === 'todos' ? null : datos.categoria_id,
    tipo: datos.tipo,
    valor: datos.valor,
    redondeo: datos.redondeo,
}))

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