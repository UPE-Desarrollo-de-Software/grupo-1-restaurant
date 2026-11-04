import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotificaciones } from '../../hooks/useNotificaciones'
import { useAtencionRealtime, usePedidosRealtime } from '../../realtime/useRealtimeEmpleado'
import {
    agregarNotificacion,
    limpiarNotificaciones,
    marcarLeida,
    marcarTodasLeidas,
    notificacionAtencion,
    notificacionPedidoCreado,
    notificacionPedidoEstado,
} from '../../realtime/notificaciones'
import type { Notificacion } from '../../types/Notificacion'
import { NotificacionModal } from './NotificacionModal'
import s from './BotonNotificaciones.module.css'

// Campanita del Navbar (sólo Mozo). Es el ÚNICO punto de suscripción a
// los canales de notificación: traduce los eventos de Reverb al store y
// abre el modal cuando llega un aviso nuevo. Las páginas ya no manejan
// alertas de atención (MozoHub/MozoMesa sólo refrescan sus datos).
export function BotonNotificaciones() {
    const [abierto, setAbierto] = useState(false)
    const notificaciones = useNotificaciones()
    const navigate = useNavigate()
    const noLeidas = notificaciones.filter(n => !n.leida).length

    function registrar(notificacion: Notificacion) {
        agregarNotificacion(notificacion)
        // Con el listado ya en pantalla, el aviso se considera visto.
        if (abierto) marcarLeida(notificacion.id)
        setAbierto(true)
    }

    useAtencionRealtime({
        alLlamar: evento => registrar(notificacionAtencion(evento)),
    })
    usePedidosRealtime({
        alCrear: evento => registrar(notificacionPedidoCreado(evento)),
        // Sólo interesa avisar cuando la cocina deja el pedido listo:
        // los pasos intermedios (enviado, en preparación, entregado…)
        // generaban avisos duplicados y ruido en la lista.
        alCambiarEstado: evento => {
            if (evento.estado === 'listo') registrar(notificacionPedidoEstado(evento))
        },
    })

    return (
        <>
            <button
                type='button'
                className={s.campana}
                aria-label={
                    noLeidas > 0
                        ? `Abrir notificaciones (${noLeidas} sin leer)`
                        : 'Abrir notificaciones'
                }
                onClick={() => setAbierto(true)}
            >
                <i className='bi bi-bell' aria-hidden='true' />
                {noLeidas > 0 && (
                    <span className={s.contador} aria-hidden='true'>
                        {noLeidas > 9 ? '9+' : noLeidas}
                    </span>
                )}
            </button>

            <NotificacionModal
                show={abierto}
                notificaciones={notificaciones}
                onHide={() => setAbierto(false)}
                onMarcarTodas={marcarTodasLeidas}
                onLimpiar={limpiarNotificaciones}
                onMarcarLeida={marcarLeida}
                onAbrirMesa={mesaId => {
                    setAbierto(false)
                    navigate(`/mozo/mesas/${mesaId}`)
                }}
            />
        </>
    )
}
