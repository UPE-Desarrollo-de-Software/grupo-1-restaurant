import { Button, Modal } from 'react-bootstrap'
import type { Notificacion } from '../../types/Notificacion'
import s from './NotificacionModal.module.css'

const HORA = new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit' })

type NotificacionModalProps = {
    show: boolean
    notificaciones: Notificacion[]
    onHide: () => void
    onMarcarTodas: () => void
    onLimpiar: () => void
    // Clic en un aviso: lo marca como leído (sólo ese) y abre la mesa
    // que lo originó.
    onMarcarLeida: (id: string) => void
    onAbrirMesa: (mesaId: number) => void
}

// Modal Notificación del mozo: listado acumulado de los avisos que
// llegan por Reverb (atención de mesa y pedidos). Reemplaza los Alert
// que antes aparecían arriba de MozoHub y MozoMesa.
export function NotificacionModal({
    show,
    notificaciones,
    onHide,
    onMarcarTodas,
    onLimpiar,
    onMarcarLeida,
    onAbrirMesa,
}: NotificacionModalProps) {
    const sinLeer = notificaciones.filter(n => !n.leida).length

    return (
        <Modal show={show} onHide={onHide} centered>
            <Modal.Header closeButton>
                <Modal.Title className='text-headline-sm'>Notificaciones</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {notificaciones.length === 0 ? (
                    <div className={s.vacio}>
                        <i className='bi bi-bell-slash' aria-hidden='true' />
                        <p className='text-body-md'>Sin notificaciones.</p>
                    </div>
                ) : (
                    <ul className={s.lista}>
                        {notificaciones.map(notificacion => (
                            <li key={notificacion.id}>
                                <button
                                    type='button'
                                    className={`${s.item} ${notificacion.leida ? '' : s.noLeida}`}
                                    aria-label={`${notificacion.titulo}. ${notificacion.detalle}${notificacion.leida ? '' : ' Sin leer.'}`}
                                    onClick={() => {
                                        onMarcarLeida(notificacion.id)
                                        onAbrirMesa(notificacion.mesa_id)
                                    }}
                                >
                                    <i
                                        className={`bi ${notificacion.tipo === 'atencion' ? 'bi-bell' : 'bi-basket'} ${s.icono}`}
                                        aria-hidden='true'
                                    />
                                    <span className={s.cuerpo}>
                                        <span className={`text-label-lg ${s.titulo}`}>{notificacion.titulo}</span>
                                        <span className={`text-body-sm ${s.detalle}`}>{notificacion.detalle}</span>
                                    </span>
                                    <span className={`text-body-sm ${s.hora}`}>
                                        {HORA.format(new Date(notificacion.fecha))}
                                    </span>
                                    {!notificacion.leida && <span className={s.punto} aria-hidden='true' />}
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </Modal.Body>
            <Modal.Footer className={s.footer}>
                <Button
                    variant='outline-secondary'
                    size='sm'
                    className='text-label-md'
                    type='button'
                    onClick={onLimpiar}
                    disabled={notificaciones.length === 0}
                >
                    <i className='bi bi-trash me-1' aria-hidden='true' />
                    Limpiar
                </Button>
                <div className='d-flex gap-2'>
                    <Button
                        variant='outline-primary'
                        size='sm'
                        className='text-label-md'
                        type='button'
                        onClick={onMarcarTodas}
                        disabled={sinLeer === 0}
                    >
                        <i className='bi bi-check2-all me-1' aria-hidden='true' />
                        Marcar todas como leídas
                    </Button>
                    <Button
                        variant='primary'
                        size='sm'
                        className='text-label-md'
                        type='button'
                        onClick={onHide}
                    >
                        Cerrar
                    </Button>
                </div>
            </Modal.Footer>
        </Modal>
    )
}
