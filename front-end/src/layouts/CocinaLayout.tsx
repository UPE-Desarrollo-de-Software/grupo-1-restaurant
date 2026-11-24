import { useSideNav } from '../navigation/useSideNav'
import { LayoutLateral } from './LayoutLateral'

// Layout del módulo de Cocina: en escritorio la navegación pasa a un Side
// Navbar (Comandas / Historial); en móvil se mantiene la actual.
export function CocinaLayout() {
    const opciones = useSideNav()

    return <LayoutLateral opciones={opciones} />
}
