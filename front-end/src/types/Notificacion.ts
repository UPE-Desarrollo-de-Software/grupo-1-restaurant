// Notificaciones internas del mozo (campanita del Navbar + Modal
// Notificación). No vienen del backend: se arman en el front a partir
// de los eventos de Reverb (.mesa.atencion / .pedido.*), que sólo traen
// ids y estados.
export type TipoNotificacion = 'atencion' | 'pedido'

export type Notificacion = {
    id: string
    tipo: TipoNotificacion
    titulo: string
    detalle: string
    // Mesa que originó el aviso: es el destino al hacer clic en el ítem.
    mesa_id: number
    pedido_id?: number
    fecha: string
    leida: boolean
}
