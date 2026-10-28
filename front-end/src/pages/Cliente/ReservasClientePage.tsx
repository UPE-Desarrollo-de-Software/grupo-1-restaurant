import { useEffect, useState } from 'react'
import { Alert, Button, Form, Modal, Spinner } from 'react-bootstrap'
import { disponibilidadReservaWeb, solicitarReservaWeb } from '../../api/cliente'
import { hoyLocal, reservaWebSchema } from '../../schemas/cliente'
import type { DisponibilidadReservaWeb, Reserva } from '../../types/Reserva'
import s from './ReservasClientePage.module.css'

function formatearFechaLarga(fecha: string): string {
    const fechaDate = new Date(`${fecha}T00:00:00`)
    if (Number.isNaN(fechaDate.getTime())) return fecha
    return fechaDate.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
}

// Reservas del cliente (público, sin login): POST /cliente/reservas.
// NO se elige mesa: es por personas + fecha + horario y el backend
// asigna una combinación de capacidades del CONFIG_MESA. La reserva
// queda PENDIENTE hasta que el local la confirme.
export function ReservasClientePage() {
    const [nombreApellido, setNombreApellido] = useState('')
    const [telefono, setTelefono] = useState('')
    const [fecha, setFecha] = useState('')
    const [hora, setHora] = useState('')
    const [cantPersonas, setCantPersonas] = useState('')

    // Disponibilidad del CONFIG_MESA para el intervalo elegido
    // (referencia; el alta no depende de que cargue). Se guarda con la
    // clave del intervalo para derivar el estado de carga en cada render.
    const [dispo, setDispo] = useState<{
        clave: string
        datos: DisponibilidadReservaWeb | null
        error: string | null
    } | null>(null)

    const [enviando, setEnviando] = useState(false)
    const [errorApi, setErrorApi] = useState<string | null>(null)
    const [reservaCreada, setReservaCreada] = useState<Reserva | null>(null)
    const [tocado, setTocado] = useState(false)

    // Errores derivados en cada render (patrón de los formularios ABM).
    const errores: Record<string, string> = {}
    const resultados = reservaWebSchema.safeParse({ nombreApellido, telefono, fecha, hora, cantPersonas })
    if (!resultados.success) {
        for (const issue of resultados.error.issues) {
            const campo = issue.path[0]
            if (typeof campo === 'string' && !errores[campo]) {
                errores[campo] = issue.message
            }
        }
    }

    // Intervalo válido solo cuando fecha y hora ya están completas.
    const intervalo = fecha && /^([01]\d|2[0-3]):[0-5]\d$/.test(hora) ? `${fecha}|${hora}` : null
    const dispoActual = intervalo !== null && dispo?.clave === intervalo ? dispo : null
    const cargandoDisponibilidad = intervalo !== null && dispoActual === null
    const disponibilidad = dispoActual?.datos ?? null
    const errorDisponibilidad = dispoActual?.error ?? null

    useEffect(() => {
        if (!intervalo) return
        const controller = new AbortController()
        disponibilidadReservaWeb(fecha, hora, controller.signal)
            .then(datos => {
                setDispo({ clave: intervalo, datos, error: null })
            })
            .catch(err => {
                if (!controller.signal.aborted) {
                    setDispo({
                        clave: intervalo,
                        datos: null,
                        error: err instanceof Error
                            ? err.message
                            : 'No se pudo consultar la disponibilidad',
                    })
                }
            })
        return () => controller.abort()
    }, [intervalo, fecha, hora])

    async function manejarSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setTocado(true)
        setErrorApi(null)
        if (!resultados.success) return

        setEnviando(true)
        try {
            const creada = await solicitarReservaWeb({
                contacto_solicitante: `${resultados.data.nombreApellido} (Tel: ${resultados.data.telefono})`,
                fecha: resultados.data.fecha,
                hora: resultados.data.hora,
                cantPersonas: resultados.data.cantPersonas,
            })
            setReservaCreada(creada)
        } catch (err) {
            // Reglas del backend (422): 2 horas de anticipación, aforo
            // insuficiente o conflicto de fecha+hora.
            setErrorApi(err instanceof Error ? err.message : 'No se pudo solicitar la reserva')
        } finally {
            setEnviando(false)
        }
    }

    function cerrarExito() {
        setReservaCreada(null)
        setNombreApellido('')
        setTelefono('')
        setFecha('')
        setHora('')
        setCantPersonas('')
        setDispo(null)
        setTocado(false)
    }

    return (
        <div className={s.pagina}>
            <header className={s.encabezado}>
                <span className={s.icono} aria-hidden='true'>
                    <i className='bi bi-calendar-check' />
                </span>
                <h1 className='text-headline-md'>Reservá tu mesa</h1>
                <p className={`text-body-md ${s.intro}`}>
                    Pedís la reserva por personas, fecha y horario —no se elige mesa—, con
                    al menos 2 horas de anticipación. El local arma las mesas según el
                    aforo disponible y te la confirma por teléfono.
                </p>
            </header>

            <section className={s.tarjeta}>
                {errorApi && <Alert variant='danger' className='text-body-md alerta'>{errorApi}</Alert>}

                <Form onSubmit={manejarSubmit} noValidate>
                    <div className={s.fila}>
                        <Form.Group className={s.campo} controlId='reserva-cliente-nombre'>
                            <Form.Label className='text-label-md'>Nombre y apellido</Form.Label>
                            <Form.Control
                                type='text'
                                placeholder='Ana Pérez'
                                value={nombreApellido}
                                onChange={e => setNombreApellido(e.target.value)}
                                isInvalid={tocado && !!errores.nombreApellido}
                            />
                            <Form.Control.Feedback type='invalid'>{errores.nombreApellido}</Form.Control.Feedback>
                        </Form.Group>

                        <Form.Group className={s.campo} controlId='reserva-cliente-telefono'>
                            <Form.Label className='text-label-md'>Teléfono de contacto</Form.Label>
                            <Form.Control
                                type='tel'
                                placeholder='11 5555-5555'
                                value={telefono}
                                onChange={e => setTelefono(e.target.value)}
                                isInvalid={tocado && !!errores.telefono}
                            />
                            <Form.Control.Feedback type='invalid'>{errores.telefono}</Form.Control.Feedback>
                        </Form.Group>
                    </div>

                    <div className={s.fila}>
                        <Form.Group className={s.campo} controlId='reserva-cliente-fecha'>
                            <Form.Label className='text-label-md'>Fecha</Form.Label>
                            <Form.Control
                                type='date'
                                min={hoyLocal()}
                                value={fecha}
                                onChange={e => setFecha(e.target.value)}
                                isInvalid={tocado && !!errores.fecha}
                            />
                            <Form.Control.Feedback type='invalid'>{errores.fecha}</Form.Control.Feedback>
                        </Form.Group>

                        <Form.Group className={s.campo} controlId='reserva-cliente-hora'>
                            <Form.Label className='text-label-md'>Hora</Form.Label>
                            <Form.Control
                                type='time'
                                value={hora}
                                onChange={e => setHora(e.target.value)}
                                isInvalid={tocado && !!errores.hora}
                            />
                            <Form.Control.Feedback type='invalid'>{errores.hora}</Form.Control.Feedback>
                        </Form.Group>

                        <Form.Group className={s.campo} controlId='reserva-cliente-personas'>
                            <Form.Label className='text-label-md'>Personas</Form.Label>
                            <Form.Control
                                type='number'
                                min={1}
                                step={1}
                                placeholder='4'
                                value={cantPersonas}
                                onChange={e => setCantPersonas(e.target.value)}
                                isInvalid={tocado && !!errores.cantPersonas}
                            />
                            <Form.Control.Feedback type='invalid'>{errores.cantPersonas}</Form.Control.Feedback>
                        </Form.Group>
                    </div>

                    <Form.Group className={s.campo} controlId='reserva-cliente-disponibilidad'>
                        <Form.Label className='text-label-md'>Disponibilidad del salón</Form.Label>
                        {!intervalo && (
                            <Form.Text className='text-body-sm'>
                                Completá fecha y hora para ver el aforo libre de ese horario.
                            </Form.Text>
                        )}
                        {intervalo && cargandoDisponibilidad && (
                            <p className='text-body-sm mb-0 d-flex align-items-center gap-2'>
                                <Spinner size='sm' animation='border' />
                                Consultando disponibilidad…
                            </p>
                        )}
                        {intervalo && errorDisponibilidad && (
                            <Form.Text className='text-body-sm'>
                                {errorDisponibilidad} Igual podés pedir la reserva: el local
                                valida el aforo cuando la reciba.
                            </Form.Text>
                        )}
                        {disponibilidad && (
                            <>
                                <Form.Text className='text-body-sm d-block'>
                                    Aforo libre para ese horario:{' '}
                                    <strong>{disponibilidad.aforo_disponible} personas</strong>
                                </Form.Text>
                                {disponibilidad.disponible.length > 0 ? (
                                    <ul className='text-body-sm mb-0 ps-3'>
                                        {disponibilidad.disponible.map(fila => (
                                            <li key={fila.capacidad}>
                                                Combinaciones de {fila.capacidad} lugares × {fila.cantidad}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <Form.Text className='text-body-sm d-block'>
                                        No quedan combinaciones libres para ese horario; probá
                                        con otro.
                                    </Form.Text>
                                )}
                            </>
                        )}
                    </Form.Group>

                    <Button
                        type='submit'
                        variant='primary'
                        className={`text-label-md ${s.botonEnviar}`}
                        disabled={enviando}
                    >
                        {enviando
                            ? (
                                <>
                                    <Spinner size='sm' animation='border' className='me-1' />
                                    Enviando…
                                </>
                            )
                            : 'Pedir reserva'}
                    </Button>
                </Form>
            </section>

            <Modal show={reservaCreada !== null} onHide={cerrarExito} centered>
                <Modal.Header closeButton>
                    <Modal.Title className='text-headline-sm'>Reserva pedida</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {reservaCreada && (
                        <>
                            <div className={s.exitoIcono} aria-hidden='true'>
                                <i className='bi bi-check2-circle' />
                            </div>
                            <p className={`text-body-md ${s.exitoTexto}`}>
                                ¡Listo! Tu reserva quedó registrada como <strong>pendiente</strong>.
                            </p>
                            <ul className={s.exitoDatos}>
                                <li className='text-body-sm'>
                                    <span>ID de la reserva</span>
                                    <strong>#{reservaCreada.id}</strong>
                                </li>
                                <li className='text-body-sm'>
                                    <span>Fecha</span>
                                    <strong>{formatearFechaLarga(reservaCreada.fecha)}</strong>
                                </li>
                                <li className='text-body-sm'>
                                    <span>Hora</span>
                                    <strong>{reservaCreada.hora} hs</strong>
                                </li>
                                <li className='text-body-sm'>
                                    <span>Personas</span>
                                    <strong>{reservaCreada.cantPersonas}</strong>
                                </li>
                                <li className='text-body-sm'>
                                    <span>Mesas</span>
                                    <strong>El local arma según aforo</strong>
                                </li>
                            </ul>
                            <p className={`text-body-sm ${s.exitoNota}`}>
                                Guardá el ID de tu reserva y mostráselo al local. Te vamos a
                                contactar al teléfono que dejaste para confirmarla.
                            </p>
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button
                        type='button'
                        variant='primary'
                        className='text-label-md'
                        onClick={cerrarExito}
                    >
                        Listo
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    )
}
