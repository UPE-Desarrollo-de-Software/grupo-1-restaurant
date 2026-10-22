import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Alert, Button, Card, Form, Spinner } from 'react-bootstrap'
import s from './Reservas.module.css'
import { reservaSchema } from '../../../schemas/reserva'
import { createReserva } from '../../../api/reservas'
import { getMesas } from '../../../api/mesas'
import { baseReservas } from '../../../navigation/rutas'
import type { Mesa } from '../../../types/Mesa'

export function CrearReservaPage() {
    const navigate = useNavigate()
    // Se sirve bajo /gerente/reservas (Gerente) y /mozo/reservas (Mozo).
    const base = baseReservas(useLocation().pathname)
    const [mesaId, setMesaId] = useState('')
    const [contacto, setContacto] = useState('')
    const [fecha, setFecha] = useState('')
    const [hora, setHora] = useState('')
    const [cantPersonas, setCantPersonas] = useState('')

    const [mesas, setMesas] = useState<Mesa[]>([])
    const [cargandoMesas, setCargandoMesas] = useState(true)
    const [errorMesas, setErrorMesas] = useState<string | null>(null)

    const [enviando, setEnviando] = useState(false)
    const [errorApi, setErrorApi] = useState<string | null>(null)
    const [exito, setExito] = useState<string | null>(null)
    const [tocado, setTocado] = useState(false)

    const errores: Record<string, string> = {}
    const resultados = reservaSchema.safeParse({
        mesa_id: mesaId,
        contacto_solicitante: contacto,
        fecha,
        hora,
        cantPersonas,
    })
    if (!resultados.success) {
        for (const issue of resultados.error.issues) {
            const campo = issue.path[0]
            if (typeof campo === 'string' && !errores[campo]) {
                errores[campo] = issue.message
            }
        }
    }

    useEffect(() => {
        const controller = new AbortController()
        getMesas(controller.signal)
            .then(setMesas)
            .catch(err => {
                if (!controller.signal.aborted) {
                    setErrorMesas(err instanceof Error ? err.message : 'Error desconocido al cargar las mesas')
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) setCargandoMesas(false)
            })
        return () => controller.abort()
    }, [])

    async function handlerSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setTocado(true)
        setExito(null)
        setErrorApi(null)

        if (!resultados.success) return

        setEnviando(true)
        try {
            await createReserva(resultados.data)
            setExito('Reserva creada exitosamente')
            setMesaId('')
            setContacto('')
            setFecha('')
            setHora('')
            setCantPersonas('')
            setTocado(false)
        } catch (err) {
            // Reglas de negocio del backend (422): lead time, capacidad
            // de la mesa, conflicto horario o "Mesa no encontrada" (404).
            setErrorApi(err instanceof Error ? err.message : 'Error desconocido al crear la reserva')
        } finally {
            setEnviando(false)
        }
    }

    return (
        <div className={s.page}>
            <Card className={s.card}>
                <h1 className={`text-headline-md ${s.title}`}>Nueva reserva</h1>
                <p className={`text-body-sm ${s.subtitle}`}>La reserva queda pendiente hasta que se cancele, finalice o se registre la inasistencia.</p>

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
                {errorMesas && <Alert variant='danger' className='text-body-md'>{errorMesas}</Alert>}

                <Form onSubmit={handlerSubmit} noValidate>
                    <div className={s.row}>
                        <Form.Group className={s.field} controlId='crear-reserva-mesa'>
                            <Form.Label className={`text-label-md ${s.label}`}>Mesa</Form.Label>
                            <Form.Select
                                className={s.input}
                                value={mesaId}
                                onChange={(e) => setMesaId(e.target.value)}
                                isInvalid={tocado && !!errores.mesa_id}
                                disabled={cargandoMesas}
                            >
                                <option value='' disabled={true}>{cargandoMesas ? 'Cargando mesas...' : 'Seleccioná una mesa'}</option>
                                {mesas.map(mesa => (
                                    <option value={mesa.id} key={mesa.id}>
                                        Mesa #{mesa.id} · {mesa.capacidad} lugares · {mesa.estado}
                                    </option>
                                ))}
                            </Form.Select>
                            <Form.Control.Feedback type='invalid'>{errores.mesa_id}</Form.Control.Feedback>
                        </Form.Group>

                        <Form.Group className={s.field} controlId='crear-reserva-contacto'>
                            <Form.Label className={`text-label-md ${s.label}`}>Contacto del solicitante</Form.Label>
                            <Form.Control
                                className={s.input}
                                type='text'
                                placeholder='Nombre y teléfono o email'
                                value={contacto}
                                onChange={(e) => setContacto(e.target.value)}
                                isInvalid={tocado && !!errores.contacto_solicitante}
                            />
                            <Form.Control.Feedback type='invalid'>{errores.contacto_solicitante}</Form.Control.Feedback>
                        </Form.Group>
                    </div>

                    <div className={s.row}>
                        <Form.Group className={s.field} controlId='crear-reserva-fecha'>
                            <Form.Label className={`text-label-md ${s.label}`}>Fecha</Form.Label>
                            <Form.Control
                                className={s.input}
                                type='date'
                                value={fecha}
                                onChange={(e) => setFecha(e.target.value)}
                                isInvalid={tocado && !!errores.fecha}
                            />
                            <Form.Control.Feedback type='invalid'>{errores.fecha}</Form.Control.Feedback>
                        </Form.Group>

                        <Form.Group className={s.field} controlId='crear-reserva-hora'>
                            <Form.Label className={`text-label-md ${s.label}`}>Hora</Form.Label>
                            <Form.Control
                                className={s.input}
                                type='time'
                                value={hora}
                                onChange={(e) => setHora(e.target.value)}
                                isInvalid={tocado && !!errores.hora}
                            />
                            <Form.Control.Feedback type='invalid'>{errores.hora}</Form.Control.Feedback>
                        </Form.Group>

                        <Form.Group className={s.field} controlId='crear-reserva-personas'>
                            <Form.Label className={`text-label-md ${s.label}`}>Cantidad de personas</Form.Label>
                            <Form.Control
                                className={s.input}
                                type='number'
                                min={1}
                                step={1}
                                placeholder='4'
                                value={cantPersonas}
                                onChange={(e) => setCantPersonas(e.target.value)}
                                isInvalid={tocado && !!errores.cantPersonas}
                            />
                            <Form.Control.Feedback type='invalid'>{errores.cantPersonas}</Form.Control.Feedback>
                        </Form.Group>
                    </div>

                    <div className={s.actions}>
                        <Button className={s.button} variant='primary' type='submit' disabled={enviando}>
                            {enviando
                                ? <><Spinner size='sm' animation='border' className='me-2' />Creando...</>
                                : 'Crear reserva'}
                        </Button>
                        <Button
                            className={s.button}
                            variant='outline-secondary'
                            type='button'
                            disabled={enviando}
                            onClick={() => navigate(base)}
                        >
                            Cancelar
                        </Button>
                    </div>
                </Form>
            </Card>
        </div>
    )
}
