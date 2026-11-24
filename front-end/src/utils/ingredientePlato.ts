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

export interface OpcionEstadoIngrediente {
    valor: OpcionIngredientePlato
    etiqueta: string
    badge: string
    icono: string
}

// Las cuatro opciones de la card, en el orden en que se muestran.
export const OPCIONES_ESTADO_INGREDIENTE: readonly OpcionEstadoIngrediente[] = [
    { valor: '', etiqueta: 'Excluido', badge: 'Excluido', icono: 'bi-slash-circle' },
    { valor: 'obligatorio', etiqueta: 'Obligatorio', badge: 'Obligatorio', icono: 'bi-lock-fill' },
    { valor: 'por_defecto', etiqueta: 'Por defecto', badge: 'Removible', icono: 'bi-check-circle-fill' },
    { valor: 'agregar', etiqueta: 'Opcional', badge: 'Para agregar', icono: 'bi-plus-circle-fill' },
]

export function etiquetaBadgeIngrediente(estado: OpcionIngredientePlato): string {
    return OPCIONES_ESTADO_INGREDIENTE.find(opcion => opcion.valor === estado)?.badge ?? ''
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