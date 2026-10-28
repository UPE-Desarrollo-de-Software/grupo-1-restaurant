// Las vistas de reservas se sirven bajo dos prefijos: /gerente/reservas
// (Gerente) y /mozo/reservas (Mozo). La base se deriva de la ruta actual
// para que los links internos (nueva reserva, gestionar, volver) apunten
// al prefijo correcto sin duplicar las páginas.

export function baseReservas(pathname: string): string {
    return pathname.startsWith('/mozo') ? '/mozo/reservas' : '/gerente/reservas'
}
