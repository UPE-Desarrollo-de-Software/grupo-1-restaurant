import { useLocation } from 'react-router-dom'
import { useRol } from '../context/RolesContext/useRol'
import { esSubruta } from './rutas'
import { SECCIONES_SUBNAV } from './secciones'
import type { SeccionNav } from './tipos'

export function useSubnav(): SeccionNav | null {
    const { pathname } = useLocation()
    const { nombreRol, loading, usuario } = useRol()

    if (!usuario || loading || !nombreRol) return null

    const coincidencias = SECCIONES_SUBNAV.filter(seccion =>
        seccion.roles.includes(nombreRol) && esSubruta(pathname, seccion.prefijo)
    )

    if (coincidencias.length === 0) return null

    return coincidencias.reduce((a, b) => (b.prefijo.length > a.prefijo.length ? b : a))
}
