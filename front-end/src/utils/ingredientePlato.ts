// Contrato entre la UI del ABM y los flags del pivot `plato_ingrediente`
// (`opcional` / `por_defecto`) del backend. El back ya valida que sólo se
// excluya lo que es opcional && por_defecto; acá se centraliza el mapeo para
// que crear/editar platos y la personalización del cliente no diverjan.
//
//   por_defecto + !opcional  → obligatorio: siempre va, el cliente no lo toca.
//   por_defecto +  opcional  → viene por defecto, el cliente puede excluirlo.
//  !por_defecto +  opcional  → el cliente puede agregarlo (cobra precioAdicional).
//  !por_defecto + !opcional  → sin uso (el ingrediente no aparece en el plato).

export type EstadoIngredientePlato = 'obligatorio' | 'por_defecto' | 'agregar'

export const ETIQUETAS_ESTADO_INGREDIENTE: Record<EstadoIngredientePlato, string> = {
    obligatorio: 'Obligatorio (siempre va en el plato)',
    por_defecto: 'Por defecto (el cliente puede quitarlo)',
    agregar: 'Para agregar (el cliente lo agrega)',
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
