import { BOTTOM_POR_ROL } from './bottom'
import type { OpcionNav } from './tipos'

/**
 * Módulos que en escritorio usan Side Navbar en lugar de la barra superior
 * y el bottom navbar. Las opciones son las mismas del bottom nav del rol
 * (mismas secciones, otro lugar de la pantalla) para no duplicar literales.
 *
 * Para sumar un módulo: agregar su entrada acá y usar `LayoutLateral` en el
 * layout de sus rutas.
 */
export const SIDE_NAV_POR_ROL: Record<string, OpcionNav[]> = {
    Cocina: BOTTOM_POR_ROL.Cocina,
}
