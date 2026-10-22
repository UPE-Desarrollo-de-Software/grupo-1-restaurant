import { useEffect, useState } from 'react'
import { Alert, Button, Form, Modal, Spinner } from 'react-bootstrap'
import { mesasReservaWeb, solicitarReservaWeb } from '../../api/cliente'
import { hoyLocal, reservaWebSchema } from '../../schemas/cliente'
import type { MesaReservaWeb, Reserva } from '../../types/Reserva'
import s from './ReservasClientePage.module.css'

function formatearFechaLarga(fecha: string): string {
    const fechaDate = new Date(`${fecha}T00:00:00`)
    if (Number.isNaN(fechaDate.getTime())) return fecha
    return fechaDate.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
}

// Reservas del cliente (público, sin login): POST /cliente/reservas.
// Elegís una mesa del mapa (GET /cliente/reservas/mesas) o, si no
// elegís, el sistema crea la mesa como "mozo virtual" validando el
// aforo. La reserva queda PENDIENTE hasta que el local la confirme.
export function ReservasClientePage() {
    const [nombreApellido, setNombreApellido] = useState('')
    const [telefono, setTelefono] = useState('')
    const [fecha, setFecha] = useState('')
    const [hora, setHora] = useState('')
    const [cantPersonas, setCantPersonas] = useState('')
    const [mesaId, setMesaId] = useState('')

    const [mesas, setMesas] = useState<MesaReservaWeb[]>([])
    const [cargandoMesas, setCargandoMesas] = useState(true)
    const [errorMesas, setErrorMesas] = useState<string | null>(null)

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

    useEffect(() => {
        const controller = new AbortController()
        mesasReservaWeb(controller.signal)
            .then(setMesas)
            .catch(err => {
                if (!controller.signal.aborted) {
                    setErrorMesas(err instanceof Error ? err.message : 'No se pudieron cargar las mesas')
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) setCargandoMesas(false)
            })
        return () => controller.abort()
    }, [])

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
                ...(mesaId !== '' ? { mesa_id: Number(mesaId) } : {}),
            })
            setReservaCreada(creada)
        } catch (err) {
            // Reglas del backend (422): 2 horas de anticipación, aforo o
            // conflicto de fecha+hora; 404 si la mesa no existe.
            setErrorApi(err instanceof Error ? err.message : 'No se pudo solicitar la reserva')
        } finally {
            setEnviando(false)
        }
    }

    // Cerrar el modal de éxito limpia el formulario (mesaId se lee en el
    // modal, por eso se resetea recién acá y no al enviar).
    function cerrarExito() {
        setReservaCreada(null)
        setNombreApellido('')
        setTelefono('')
        setFecha('')
        setHora('')
        setCantPersonas('')
        setMesaId('')
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
                    Pedí la reserva en el día con al menos 2 horas de anticipación. Queda
                    pendiente hasta que el local te la confirme por teléfono.
                </p>
            </header>

            <section className={s.tarjeta}>
                {errorApi && <Alert variant='danger' className='text-body-md alerta'>{errorApi}</Alert>}
                {errorMesas && (
                    <Alert variant='warning' className='text-body-sm alerta'>
                        {errorMesas} Igual podés pedir la reserva: si no elegís mesa, el local
                        te asigna una.
                    </Alert>
                )}

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

                    <Form.Group className={s.campo} controlId='reserva-cliente-mesa'>
                        <Form.Label className='text-label-md'>Mesa (opcional)</Form.Label>
                        <Form.Select
                            value={mesaId}
                            onChange={e => setMesaId(e.target.value)}
                            disabled={cargandoMesas}
                        >
                            <option value=''>
                                {cargandoMesas ? 'Cargando mesas…' : 'Que el local me asigne una'}
                            </option>
                            {mesas.map(mesa => (
                                <option key={mesa.id} value={mesa.id}>
                                    Mesa #{mesa.id} · {mesa.capacidad} lugares
                                    {mesa.estado === 'reservada' ? ' · reservada' : ''}
                                </option>
                            ))}
                        </Form.Select>
                        <Form.Text className='text-body-sm'>
                            Si no elegís, el sistema crea una mesa nueva según la cantidad de
                            personas.
                        </Form.Text>
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
                                    <span>Mesa</span>
                                    <strong>
                                        {mesaId !== '' ? `#${mesaId} (elegida)` : 'Nosotros asignamos una'}
                                    </strong>
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
