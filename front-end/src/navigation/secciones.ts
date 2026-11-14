import type { SeccionNav } from './tipos'

// Cada opción cubre su sub-árbol de rutas (ver `opcionActiva`): la tab
// '/gerente/carta/platos' sigue activa en '/gerente/carta/platos/crear' y en
// '/gerente/carta/platos/:id/editar'. Sin `end`, no hace falta repetir la
// regla en cada pantalla secundaria.
export const SECCIONES_SUBNAV: SeccionNav[] = [
    {
        prefijo: '/gerente/carta',
        roles: ['Gerente'],
        opciones: [
            { to: '/gerente/carta/platos', label: 'Platos' },
            { to: '/gerente/carta/categorias', label: 'Categorías' },
            { to: '/gerente/carta/ingredientes', label: 'Ingredientes' },
            { to: '/gerente/carta/promociones', label: 'Promociones' },
        ],
    },
    {
        prefijo: '/gerente/mesas',
        roles: ['Gerente'],
        opciones: [
            { to: '/gerente/mesas/gestion', label: 'Mesas' },
            { to: '/gerente/mesas/configuracion', label: 'Configuración' },
            { to: '/gerente/mesas/qr', label: 'QR' },
            { to: '/gerente/mesas/comandas', label: 'Comandas' },
        ],
    },
]
