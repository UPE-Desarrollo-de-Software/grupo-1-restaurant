// Contrato entre la UI del ABM y los flags del pivot `plato_ingrediente`
// (`opcional` / `por_defecto` / `precio_adicional`) del backend. El back ya
// valida que sólo se excluya lo que es opcional && por_defecto; acá se
// centraliza el mapeo para que crear/editar platos y la personalización del
// cliente no diverjan.
//
//   por_defecto + !opcional  → obligatorio: siempre va, el cliente no lo toca.
//   por_defecto +  opcional  → viene por defecto, el cliente puede excluirlo.
//  !por_defecto +  opcional  → el cliente puede agregarlo (cobra precioAdicional).
//  !por_defecto + !opcional  → sin uso (el ingrediente no aparece en el plato).

import type { IngredientePlato } from '../types/Menu'

export type EstadoIngredientePlato = 'obligatorio' | 'por_defecto' | 'agregar'

// '' = el ingrediente queda fuera del plato (no se envía en el pivot).
export type OpcionIngredientePlato = '' | EstadoIngredientePlato

export interface ConfiguracionIngrediente {
    estado: OpcionIngredientePlato
    // Se guarda como texto: el usuario puede vaciarlo (hereda el catálogo) y
    // tipear decimales sin que React reescriba el input.
    precioAdicional: string
}

// `tono` es la clave de color del estado en CSS ('' usa la clave 'excluido').
export type TonoEstadoIngrediente = 'excluido' | 'obligatorio' | 'por_defecto' | 'agregar'

export interface OpcionEstadoIngrediente {
    valor: OpcionIngredientePlato
    tono: TonoEstadoIngrediente
    // Botón de la card y subtítulo que lo explica.
    etiqueta: string
    resumen: string
    // Fila del panel emergente: título, explicación y chip a la derecha.
    titulo: string
    descripcion: string
    tag: string
    icono: string
}

// Las cuatro opciones en el orden del panel emergente.
export const OPCIONES_ESTADO_INGREDIENTE: readonly OpcionEstadoIngrediente[] = [
    {
        valor: 'obligatorio',
        tono: 'obligatorio',
        etiqueta: 'Obligatorio',
        resumen: 'Fijo en el plato',
        titulo: 'Obligatorio',
        descripcion: 'El cliente no puede quitarlo ni pedir el plato sin este ingrediente.',
        tag: 'Fijo en plato',
        icono: 'bi-lock-fill',
    },
    {
        valor: 'por_defecto',
        tono: 'por_defecto',
        etiqueta: 'Por defecto',
        resumen: 'Se puede quitar',
        titulo: 'Por defecto (Removible)',
        descripcion: 'Viene con la receta base, pero el comensal puede marcarlo como "sin ...".',
        tag: '',
        icono: 'bi-check-circle-fill',
    },
    {
        valor: 'agregar',
        tono: 'agregar',
        etiqueta: 'Para agregar',
        resumen: 'Recargo al agregar',
        titulo: 'Para agregar (Opcional)',
        descripcion: 'No viene en la preparación estándar; el comensal puede sumarlo opcionalmente con recargo.',
        tag: '+Extra configurable',
        icono: 'bi-plus-circle-fill',
    },
    {
        valor: '',
        tono: 'excluido',
        etiqueta: 'Excluido',
        resumen: 'No se incluye en el plato',
        titulo: 'No incluir',
        descripcion: 'Queda excluido del plato y oculto en la carta para evitar confusiones de cocina.',
        tag: 'Desactivado',
        icono: 'bi-slash-circle',
    },
]

// Estado sin configurar ('' = excluido) también resuelve: es la última opción.
export function opcionEstadoIngrediente(estado: OpcionIngredientePlato): OpcionEstadoIngrediente {
    return OPCIONES_ESTADO_INGREDIENTE.find(opcion => opcion.valor === estado)
        ?? OPCIONES_ESTADO_INGREDIENTE[OPCIONES_ESTADO_INGREDIENTE.length - 1]
}

export function estadoDesdePivot(pivot: { opcional: boolean; por_defecto: boolean }): EstadoIngredientePlato | null {
    if (pivot.por_defecto) return pivot.opcional ? 'por_defecto' : 'obligatorio'
    return pivot.opcional ? 'agregar' : null
}

export function flagsDesdeEstado(estado: EstadoIngredientePlato): { opcional: boolean; por_defecto: boolean } {
    switch (estado) {
        case 'obligatorio':
            return { opcional: false, por_defecto: true }
        case 'por_defecto':
            return { opcional: true, por_defecto: true }
        case 'agregar':
            return { opcional: true, por_defecto: false }
    }
}

// El backend ya expone en `precioAdicional` el recargo efectivo del plato
// (override del pivot o catálogo): el campo arranca con lo que se cobra.
export function configuracionDesdeIngrediente(ingrediente: IngredientePlato): ConfiguracionIngrediente | null {
    const estado = estadoDesdePivot(ingrediente.pivot)

    if (estado === null) return null

    return { estado, precioAdicional: String(ingrediente.precioAdicional) }
}

export interface IngredientePlatoPayload {
    ingrediente_id: number
    opcional: boolean
    por_defecto: boolean
    precio_adicional: number | null
}

// El recargo del plato sólo aplica al ingrediente Opcional: en el resto se
// manda `null` para que siga heredando el catálogo. `0` es un override válido.
export function ingredientesParaPayload(
    configuracion: Record<number, ConfiguracionIngrediente>
): IngredientePlatoPayload[] {
    return Object.entries(configuracion).flatMap(([id, conf]) => {
        if (conf.estado === '') return []

        return [{
            ingrediente_id: Number(id),
            ...flagsDesdeEstado(conf.estado),
            precio_adicional: conf.estado === 'agregar' ? precioDesdeTexto(conf.precioAdicional) : null,
        }]
    })
}

function precioDesdeTexto(texto: string): number | null {
    const limpio = texto.trim()

    if (limpio === '') return null

    const numero = Number(limpio)

    if (!Number.isFinite(numero) || numero < 0) return null

    return Math.round(numero * 100) / 100
}