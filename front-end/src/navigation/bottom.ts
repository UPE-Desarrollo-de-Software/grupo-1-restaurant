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
        { to: '/gerente/carta', label: 'Carta', icon: 'bi-journal-text' },
        { to: '/gerente/mesas', label: 'Mesas', icon: 'bi-grid-3x3-gap' },
        { to: '/gerente/reservas', label: 'Reservas', icon: 'bi-calendar-check' },
        { to: '/gerente/usuarios', label: 'Usuarios', icon: 'bi-people' },
    ],
    Cocina: [
        { to: '/cocina', label: 'Pedidos', icon: 'bi-list-check', end: true },
    ],
    Mozo: [
        { to: '/mozo', label: 'Mesas', icon: 'bi-grid-3x3-gap', end: true },
        { to: '/mozo/reservas', label: 'Reservas', icon: 'bi-calendar-check' },
    ],
}