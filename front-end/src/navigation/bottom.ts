import type { OpcionNav } from './tipos'

export const NAV_PUBLICO: OpcionNav[] = [
    { to: '/carta', label: 'Carta', icon: 'bi-journal-text' },
    { to: '/pedido', label: 'Mi pedido', icon: 'bi-basket' },
    { to: '/reservas', label: 'Reservas', icon: 'bi-calendar-check' },
    { to: '/mesa', label: 'Mesa', icon: 'bi-box-arrow-in-right' },
]

export const BOTTOM_POR_ROL: Record<string, OpcionNav[]> = {
    Gerente: [
        { to: '/gerente', label: 'Panel', icon: 'bi-bar-chart-line', end: true },
        // `raiz` porque el link abre la primera pantalla de la sección pero la
        // tab debe seguir activa en todo el sub-árbol (crear, editar, etc.).
        { to: '/gerente/carta/platos', label: 'Carta', icon: 'bi-journal-text', raiz: '/gerente/carta' },
        { to: '/gerente/mesas/gestion', label: 'Mesas', icon: 'bi-grid-3x3-gap', raiz: '/gerente/mesas' },
        { to: '/gerente/reservas', label: 'Reservas', icon: 'bi-calendar-check' },
        { to: '/gerente/usuarios', label: 'Usuarios', icon: 'bi-people' },
    ],
    Cocina: [
        // Sin `end`: Comandas sigue activa en /cocina/comandas/:id.
        { to: '/cocina/comandas', label: 'Comandas', icon: 'bi-list-check' },
        { to: '/cocina/historial', label: 'Historial', icon: 'bi-clock-history', end: true },
    ],
    Mozo: [
        // El hub del mozo es '/mozo', pero la tab cubre también sus pantallas
        // de mesa (/mozo/mesas/crear, /mozo/mesas/:id). Sin `end`: si lo
        // tuviera, '/mozo' quedaría inactiva en esas rutas.
        { to: '/mozo', label: 'Mesas', icon: 'bi-grid-3x3-gap', raiz: '/mozo/mesas' },
        { to: '/mozo/reservas', label: 'Reservas', icon: 'bi-calendar-check' },
    ],
}