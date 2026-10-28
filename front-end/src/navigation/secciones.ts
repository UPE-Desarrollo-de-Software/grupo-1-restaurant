import type { SeccionNav } from './tipos'

export const SECCIONES_SUBNAV: SeccionNav[] = [
    {
        prefijo: '/gerente/carta',
        roles: ['Gerente'],
        opciones: [
            { to: '/gerente/carta/platos', label: 'Platos', end: true },
            { to: '/gerente/carta/categorias', label: 'Categorías', end: true },
            { to: '/gerente/carta/ingredientes', label: 'Ingredientes', end: true },
            { to: '/gerente/carta/promociones', label: 'Promociones', end: true },
        ],
    },
    {
        prefijo: '/gerente/mesas',
        roles: ['Gerente'],
        opciones: [
            { to: '/gerente/mesas/gestion', label: 'Gestión de mesas', end: true },
            { to: '/gerente/mesas/configuracion', label: 'Configuración', end: true },
            { to: '/gerente/mesas/qr', label: 'Códigos QR', end: true },
            { to: '/gerente/mesas/comandas', label: 'Comandas', end: true },
        ],
    },
    {
        prefijo: '/gerente/reservas',
        roles: ['Gerente'],
        opciones: [{ to: '/gerente/reservas', label: 'Reservas', end: true }],
    },
    {
        prefijo: '/gerente/usuarios',
        roles: ['Gerente'],
        opciones: [{ to: '/gerente/usuarios', label: 'Usuarios', end: true }],
    },
    {
        prefijo: '/gerente/historial-acciones',
        roles: ['Gerente'],
        opciones: [{ to: '/gerente/historial-acciones', label: 'Historial de acciones', end: true }],
    },
    {
        prefijo: '/cocina',
        roles: ['Cocina'],
        opciones: [{ to: '/cocina', label: 'Pedidos', end: true }],
    },
    {
        prefijo: '/mozo/reservas',
        roles: ['Mozo'],
        opciones: [{ to: '/mozo/reservas', label: 'Reservas', end: true }],
    },
    {
        prefijo: '/mozo',
        roles: ['Mozo'],
        opciones: [{ to: '/mozo', label: 'Mesas', end: true }],
    },
]
