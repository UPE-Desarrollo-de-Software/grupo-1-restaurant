import type { OpcionNav } from './tipos'

// Las vistas de reservas se sirven bajo dos prefijos: /gerente/reservas
// (Gerente) y /mozo/reservas (Mozo). La base se deriva de la ruta actual
// para que los links internos (nueva reserva, gestionar, volver) apunten
// al prefijo correcto sin duplicar las páginas.

export function baseReservas(pathname: string): string {
    return pathname.startsWith('/mozo') ? '/mozo/reservas' : '/gerente/reservas'
}

// `raiz` cubre su ruta exacta y todo su sub-árbol, comparando por segmento:
// '/gerente/carta/platos' cubre '/gerente/carta/platos/crear' y
// '/gerente/carta/platos/5/editar', pero no '/gerente/carta/platos-extra'.
export function esSubruta(pathname: string, raiz: string): boolean {
    return pathname === raiz || pathname.startsWith(`${raiz}/`)
}

// Regla única de "opción activa" para SubNavbar, BottomNavbar y SideNavbar:
// coincidencia exacta con `to` o permanencia dentro del sub-árbol de `raiz`
// (que por defecto es `to`). Con `end: true` sólo cuenta la coincidencia exacta.
export function opcionActiva(pathname: string, opcion: OpcionNav): boolean {
    if (pathname === opcion.to) return true
    if (opcion.end) return false
    return esSubruta(pathname, opcion.raiz ?? opcion.to)
}
