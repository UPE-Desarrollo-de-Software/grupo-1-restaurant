import { useRol } from '../context/RolesContext/useRol'
import { BOTTOM_POR_ROL, NAV_PUBLICO } from './bottom'
import type { OpcionNav } from './tipos'

export function useBottomNav(): OpcionNav[] {
    const { nombreRol, loading, usuario } = useRol()

    if (!usuario) return NAV_PUBLICO
    if (loading) return []
    return BOTTOM_POR_ROL[nombreRol ?? ''] ?? NAV_PUBLICO
}
