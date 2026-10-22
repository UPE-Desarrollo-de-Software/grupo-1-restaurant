import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Alert, Button, Card, Form, Spinner } from 'react-bootstrap'
import s from './Reservas.module.css'
import { cancelarReserva, finalizarReserva, getReserva, inasistioReserva } from '../../../api/reservas'
import { baseReservas } from '../../../navigation/rutas'
import type { EstadoReserva, Reserva } from '../../../types/Reserva'

const ESTADOS: Record<EstadoReserva, string> = {
    pendiente: 'Pendiente',
    cancelada: 'Cancelada',
    finalizada: 'Finalizada',
    no_asistio: 'No asistió',
}

// Las fechas llegan "YYYY-MM-DD" (también tolera datetime cortando a 10).
const formatearFecha = (fecha: string): string => {
    const [anio, mes, dia] = fecha.slice(0, 10).split('-')
    return `${dia}/${mes}/${anio}`
}

type Transicion = 'cancelar' | 'finalizar' | 'inasistio'

export function EditarReservaPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    // Se sirve bajo /gerente/reservas (Gerente) y /mozo/reservas (Mozo).
    const base = baseReservas(useLocation().pathname)

    const [reserva, setReserva] = useState<Reserva | null>(null)
    const [cargando, setCargando] = useState(true)
    const [transicion, setTransicion] = useState<Transicion | null>(null)
    const [errorApi, setErrorApi] = useState<string | null>(null)
    const [exito, setExito] = useState<string | null>(null)

    useEffect(() => {
        const controller = new AbortController()
        getReserva(Number(id), controller.signal)
            .then(setReserva)
            .catch(err => {
                if (!controller.signal.aborted) {
                    setErrorApi(err instanceof Error ? err.message : 'Error desconocido al cargar la reserva')
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) setCargando(false)
            })
        return () => controller.abort()
    }, [id])

    async function handlerTransicion(accion: Transicion) {
        setTransicion(accion)
        setErrorApi(null)
        setExito(null)
        try {
            const rta = accion === 'cancelar'
                ? await cancelarReserva(Number(id))
                : accion === 'finalizar'
                    ? await finalizarReserva(Number(id))
                    : await inasistioReserva(Number(id))
            setReserva(rta.reserva)
            setExito(rta.mensaje)
        } catch (err) {
            // 422 del backend ("Solo se pueden cancelar reservas con
            // estado pendiente", "Aún no llegó la hora de la reserva").
            setErrorApi(err instanceof Error ? err.message : 'Error desconocido al actualizar la reserva')
        } finally {
            setTransicion(null)
        }
    }

    if (cargando) {
        return (
            <div className={s.page}>
                <Card className={s.card}>
                    <div className='d-flex justify-content-center py-4'>
                        <Spinner animation='border' />
                    </div>
                </Card>
            </div>
        )
    }

    if (!reserva) {
        return (
            <div className={s.page}>
                <Card className={s.card}>
                    <h1 className={`text-headline-md ${s.title}`}>Reserva</h1>
                    {errorApi && <Alert variant='danger' className='text-body-md'>{errorApi}</Alert>}
                    <Button
                        className='text-label-md'
                        variant='outline-secondary'
                        type='button'
                        onClick={() => navigate(base)}
                    >
                        Volver a la lista
                    </Button>
                </Card>
            </div>
        )
    }

    const esPendiente = reserva.estado === 'pendiente'
    const ocupado = transicion !== null

    return (
        <div className={s.page}>
            <Card className={s.card}>
                <h1 className={`text-headline-md ${s.title}`}>Gestionar reserva</h1>
                <p className={`text-body-sm ${s.subtitle}`}>
                    {esPendiente
                        ? 'Registrá el resultado de la reserva cuando corresponda.'
                        : 'Esta reserva ya fue resuelta: solo puede consultarse.'}
                </p>

                {exito && (
                    <Alert variant='success' className='text-body-md d-flex flex-wrap align-items-center justify-content-between gap-2'>
                        <span>{exito}</span>
                        <Button
                            className='text-label-md'
                            variant='outline-success'
                            size='sm'
                            type='button'
                            onClick={() => navigate(base)}
                        >
                            Volver a la lista
                        </Button>
                    </Alert>
                )}
                {errorApi && <Alert variant='danger' className='text-body-md'>{errorApi}</Alert>}

                <Form onSubmit={(e) => e.preventDefault()} noValidate>
                    <div className={s.row}>
                        <Form.Group className={s.field} controlId='ver-reserva-contacto'>
                            <Form.Label className={`text-label-md ${s.label}`}>Contacto del solicitante</Form.Label>
                            <Form.Control className={s.input} type='text' value={reserva.contacto_solicitante} readOnly />
                        </Form.Group>

                        <Form.Group className={s.field} controlId='ver-reserva-estado'>
                            <Form.Label className={`text-label-md ${s.label}`}>Estado</Form.Label>
                            <Form.Control className={s.input} type='text' value={ESTADOS[reserva.estado]} readOnly />
                        </Form.Group>
                    </div>

                    <div className={s.row}>
                        <Form.Group className={s.field} controlId='ver-reserva-mesa'>
                            <Form.Label className={`text-label-md ${s.label}`}>Mesa</Form.Label>
                            <Form.Control
                                className={s.input}
                                type='text'
                                value={`Mesa #${reserva.mesa_id}${reserva.mesa ? ` · ${reserva.mesa.capacidad} lugares` : ''}`}
                                readOnly
                            />
                        </Form.Group>

                        <Form.Group className={s.field} controlId='ver-reserva-fecha'>
                            <Form.Label className={`text-label-md ${s.label}`}>Fecha</Form.Label>
                            <Form.Control className={s.input} type='text' value={formatearFecha(reserva.fecha)} readOnly />
                        </Form.Group>

                        <Form.Group className={s.field} controlId='ver-reserva-hora'>
                            <Form.Label className={`text-label-md ${s.label}`}>Hora</Form.Label>
                            <Form.Control className={s.input} type='text' value={`${reserva.hora} h`} readOnly />
                        </Form.Group>

                        <Form.Group className={s.field} controlId='ver-reserva-personas'>
                            <Form.Label className={`text-label-md ${s.label}`}>Personas</Form.Label>
                            <Form.Control className={s.input} type='text' value={String(reserva.cantPersonas)} readOnly />
                        </Form.Group>
                    </div>
                </Form>
            </Card>

            {esPendiente && (
                <div className={s.zonaWrap}>
                    <Card className={s.card}>
                        <h2 className={`text-headline-sm ${s.title}`}>Acciones de la reserva</h2>
                        <p className={`text-body-sm ${s.subtitle}`}>
                            Cancelá si el cliente no va a venir, finalizá cuando ya haya concurrido, o registrá la
                            inasistencia. Finalizar y marcar inasistencia solo se aplican después de la hora reservada.
                        </p>

                        <div className={s.actions}>
                            <Button
                                className={s.button}
                                variant='outline-danger'
                                type='button'
                                disabled={ocupado}
                                onClick={() => handlerTransicion('cancelar')}
                            >
                                {transicion === 'cancelar'
                                    ? <><Spinner size='sm' animation='border' className='me-2' />Cancelando...</>
                                    : <><i className='bi bi-x-circle me-2' aria-hidden='true' />Cancelar reserva</>}
                            </Button>
                            <Button
                                className={s.button}
                                variant='outline-success'
                                type='button'
                                disabled={ocupado}
                                onClick={() => handlerTransicion('finalizar')}
                            >
                                {transicion === 'finalizar'
                                    ? <><Spinner size='sm' animation='border' className='me-2' />Finalizando...</>
                                    : <><i className='bi bi-check-circle me-2' aria-hidden='true' />Finalizó la visita</>}
                            </Button>
                            <Button
                                className={s.button}
                                variant='outline-secondary'
                                type='button'
                                disabled={ocupado}
                                onClick={() => handlerTransicion('inasistio')}
                            >
                                {transicion === 'inasistio'
                                    ? <><Spinner size='sm' animation='border' className='me-2' />Registrando...</>
                                    : <><i className='bi bi-person-x me-2' aria-hidden='true' />No asistió</>}
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    )
}
