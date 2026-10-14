import { useLocation } from 'react-router-dom'
import { useRol } from '../context/RolesContext/useRol'
import { SECCIONES_SUBNAV } from './secciones'
import type { OpcionNav } from './tipos'

export function useSubnav(): OpcionNav[] | null {
    const { pathname } = useLocation()
    const { nombreRol, loading, usuario } = useRol()

    if (!usuario || loading || !nombreRol) return null

    const coincidencias = SECCIONES_SUBNAV.filter(seccion =>
        seccion.roles.includes(nombreRol) &&
        (pathname === seccion.prefijo || pathname.startsWith(`${seccion.prefijo}/`))
    )

    if (coincidencias.length === 0) return null

    const seccion = coincidencias.reduce((a, b) => (b.prefijo.length > a.prefijo.length ? b : a))
    return seccion.opciones
}
