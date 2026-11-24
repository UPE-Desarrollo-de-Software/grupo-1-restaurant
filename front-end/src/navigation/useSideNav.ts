import { useRol } from '../context/RolesContext/useRol'
import { SIDE_NAV_POR_ROL } from './side'
import type { OpcionNav } from './tipos'

// Opciones del Side Navbar según el rol. Un array vacío significa que el
// módulo no tiene navegación lateral (sigue con navbar + bottom navbar).
export function useSideNav(): OpcionNav[] {
    const { nombreRol, usuario } = useRol()

    if (!usuario || !nombreRol) return []
    return SIDE_NAV_POR_ROL[nombreRol] ?? []
}
