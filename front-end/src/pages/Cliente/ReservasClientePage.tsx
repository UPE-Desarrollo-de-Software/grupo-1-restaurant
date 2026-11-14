import { useEffect, useRef, useState } from 'react'
import { Alert, Button, Form, Modal, Spinner } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import { QRCodeCanvas } from 'qrcode.react'
import { disponibilidadDiaReservaWeb, solicitarReservaWeb } from '../../api/cliente'
import { hoyLocal, reservaWebSchema } from '../../schemas/cliente'
import { useAhora } from '../../hooks/useAhora'
import { PreordenCliente } from '../../components/Cliente/PreordenCliente'
import { descargarComprobanteReserva } from '../../utils/comprobanteReserva'
import type { DisponibilidadDiaReservaWeb, LineaPreorden, Reserva, SlotDisponibilidad } from '../../types/Reserva'
import s from './ReservasClientePage.module.css'

// Anticipación mínima que exige el backend (ReservaService: 2 horas).
const ANTICIPACION_MIN = 2 * 60

function formatearFechaLarga(fecha: string): string {
    const fechaDate = new Date(`${fecha}T00:00:00`)
    if (Number.isNaN(fechaDate.getTime())) return fecha
    return fechaDate.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
}

// PIN que el cliente presenta al llegar: el `codigo` de 4 dígitos que
// genera el backend (string, conserva los ceros a la izquierda). El id
// queda sólo como fallback por si una respuesta vieja no lo trae.
function pinReserva(reserva: Reserva): string {
    return reserva.codigo ?? String(reserva.id)
}

function horaAMinutos(hora: string): number {
    const [horas, minutos] = hora.split(':').map(Number)
    return horas * 60 + minutos
}

// Reservas del cliente (público, sin login): POST /cliente/reservas.
// NO se elige mesa: es por personas + fecha + horario y el backend
// asigna una combinación de capacidades del CONFIG_MESA. El horario se
// elige de la grilla fija de turnos (12:00–23:00 cada 30 min) que
// devuelve GET /cliente/reservas/disponibilidad-dia, filtrada por la
// cantidad de personas y por la anticipación de 2 horas.
export function ReservasClientePage() {
    const [nombreApellido, setNombreApellido] = useState('')
    const [fecha, setFecha] = useState('')
    const [hora, setHora] = useState('')
    const [cantPersonas, setCantPersonas] = useState('')

    // const [codigo, setCodigo] = useState<string | null>(null)

    // Grilla del día cacheada por fecha: se muestra al instante si se
    // vuelve a una fecha ya consultada mientras se refresca.
    const [horarios, setHorarios] = useState<
        Record<string, { datos: DisponibilidadDiaReservaWeb | null; error: string | null }>
    >({})
    const [reintento, setReintento] = useState(0)

    const ahora = useAhora()

    const [enviando, setEnviando] = useState(false)
    const [errorApi, setErrorApi] = useState<string | null>(null)
    const [reservaCreada, setReservaCreada] = useState<Reserva | null>(null)
    const [tocado, setTocado] = useState(false)
    const [copiado, setCopiado] = useState(false)

    // Carrito de pre-orden (opcional): se manda junto con el alta y
    // queda guardado contra la reserva; la edición posterior es por PIN
    // en /preorden. El PIN real de la reserva es `codigo` (el id es solo
    // fallback de respuestas viejas).
    const [lineasPreorden, setLineasPreorden] = useState<LineaPreorden[]>([])
    const pinReserva = reservaCreada
        ? (reservaCreada.codigo ?? String(reservaCreada.id))
        : ''
    const cantidadPreorden = lineasPreorden.reduce((suma, linea) => suma + linea.cantidad, 0)

    // QR en alta resolución del enlace de pre-orden: alimenta al
    // comprobante PDF (se renderiza fuera de pantalla, como en QrMesas).
    const qrRef = useRef<HTMLCanvasElement>(null)

    // const datosQR = reservaCreada
    // ? JSON.stringify({
    //     codigoReserva: reservaCreada.id,
    //     fecha: reservaCreada.fecha,
    //     hora: reservaCreada.hora,
    //     cantPersonas: reservaCreada.cantPersonas,
    // })
    // : ''

    // Errores derivados en cada render (patrón de los formularios ABM).
    const errores: Record<string, string> = {}
    const resultados = reservaWebSchema.safeParse({ nombreApellido, fecha, hora, cantPersonas })
    if (!resultados.success) {
        for (const issue of resultados.error.issues) {
            const campo = issue.path[0]
            if (typeof campo === 'string' && !errores[campo]) {
                errores[campo] = issue.message
            }
        }
    }

    const personasValidas = Number.isInteger(Number(cantPersonas)) && Number(cantPersonas) >= 1
    const personas = personasValidas ? Number(cantPersonas) : 0

    const diaActual = fecha ? horarios[fecha] : undefined
    const cargandoHorarios = !!fecha && diaActual === undefined
    const errorHorarios = diaActual?.error ?? null
    const slots = diaActual?.datos?.slots ?? []

    const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes()
    const limiteAnticipacion = minutosAhora + ANTICIPACION_MIN
    const esHoy = fecha === hoyLocal()

    function fueraDeAnticipacion(slot: SlotDisponibilidad): boolean {
        return esHoy && horaAMinutos(slot.hora) < limiteAnticipacion
    }

    function motivoDeshabilitado(slot: SlotDisponibilidad): string | null {
        if (fueraDeAnticipacion(slot)) {
            return 'Faltan 2 horas de anticipación'
        }
        if (!personasValidas) {
            return 'Indicá cuántas personas son'
        }
        if (slot.aforo_disponible < personas) {
            return 'Sin lugar para esa cantidad de personas'
        }
        return null
    }

    const slotSeleccionado = slots.find(slot => slot.hora === hora) ?? null

    useEffect(() => {
        if (!fecha) return
        const controller = new AbortController()
        disponibilidadDiaReservaWeb(fecha, controller.signal)
            .then(datos => {
                setHorarios(prev => ({ ...prev, [fecha]: { datos, error: null } }))
            })
            .catch(err => {
                if (!controller.signal.aborted) {
                    setHorarios(prev => ({
                        ...prev,
                        [fecha]: {
                            datos: null,
                            error: err instanceof Error
                                ? err.message
                                : 'No se pudieron cargar los horarios',
                        },
                    }))
                }
            })
        return () => controller.abort()
    }, [fecha, reintento])

    function cambiarFecha(valor: string) {
        setFecha(valor)
        // El horario pertenece a la fecha anterior: no lo arrastres.
        setHora('')
    }

    function cambiarPersonas(valor: string) {
        setCantPersonas(valor)
        const nuevoTotal = Number(valor)
        if (!hora) return
        const slot = slots.find(candidato => candidato.hora === hora)
        if (
            !Number.isInteger(nuevoTotal) || nuevoTotal < 1
            || !slot || slot.aforo_disponible < nuevoTotal
        ) {
            setHora('')
        }
    }

    async function handlerCopiar() {
        if (!reservaCreada) return
        try {
            await navigator.clipboard.writeText(pinReserva)
            setCopiado(true)
        } catch {
            setCopiado(false)
        }
    }

    // Comprobante PDF con la estética de la app (ver utils/comprobanteReserva):
    // banda terracota con logo, PIN protagonista, QR a /preorden y la
    // pre-orden resumida en caja sage.
    async function descargarComprobante() {
        if (!reservaCreada) return

        await descargarComprobanteReserva({
            pin: pinReserva,
            fecha: reservaCreada.fecha,
            hora: reservaCreada.hora,
            cantPersonas: reservaCreada.cantPersonas,
            contacto: reservaCreada.contacto_solicitante,
            cantidadPreorden,
            qrDataUrl: qrRef.current?.toDataURL('image/png') ?? null,
            origen: window.location.origin,
        })
    }

    async function manejarSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setTocado(true)
        setErrorApi(null)
        if (!resultados.success) return

        setEnviando(true)
        try {
            const creada = await solicitarReservaWeb({
                contacto_solicitante: `${resultados.data.nombreApellido}`,
                fecha: resultados.data.fecha,
                hora: resultados.data.hora,
                cantPersonas: resultados.data.cantPersonas,
                // El back hace merge por plato_id al alta; sin líneas no
                // se manda la clave (el JSON la omitiría igual).
                ...(lineasPreorden.length > 0 ? { preorden: lineasPreorden } : {}),
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
        setFecha('')
        setHora('')
        setCantPersonas('')
        setHorarios({})
        setReintento(0)
        setTocado(false)
        setLineasPreorden([])
        setCopiado(false)
    }

    return (
        <div className={s.pagina}>
            <header className={s.encabezado}>
                <span className={s.icono} aria-hidden='true'>
                    <i className='bi bi-calendar-check' />
                </span>
                <h1 className='text-headline-md'>Reservá tu mesa</h1>
                <p className={`text-body-sm ${s.intro}`}>
                    Armá tu pedido mientras reservás: al llegar a la mesa se envía solo.{' '}
                    <Link to='/preorden'>¿Ya tenés reserva? Modificala con tu PIN</Link>
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

                        {/* <Form.Group className={s.campo} controlId='reserva-cliente-telefono'>
                            <Form.Label className='text-label-md'>Teléfono de contacto</Form.Label>
                            <Form.Control
                                type='tel'
                                placeholder='11 5555-5555'
                                value={telefono}
                                onChange={e => setTelefono(e.target.value)}
                                isInvalid={tocado && !!errores.telefono}
                            />
                            <Form.Control.Feedback type='invalid'>{errores.telefono}</Form.Control.Feedback>
                        </Form.Group> */}
                    </div>

                    <div className={s.fila}>
                        <Form.Group className={s.campo} controlId='reserva-cliente-personas'>
                            <Form.Label className='text-label-md'>Personas</Form.Label>
                            <Form.Control
                                type='number'
                                min={1}
                                step={1}
                                placeholder='4'
                                value={cantPersonas}
                                onChange={e => cambiarPersonas(e.target.value)}
                                isInvalid={tocado && !!errores.cantPersonas}
                            />
                            <Form.Control.Feedback type='invalid'>{errores.cantPersonas}</Form.Control.Feedback>
                        </Form.Group>

                        <Form.Group className={s.campo} controlId='reserva-cliente-fecha'>
                            <Form.Label className='text-label-md'>Fecha</Form.Label>
                            <Form.Control
                                type='date'
                                min={hoyLocal()}
                                value={fecha}
                                onChange={e => cambiarFecha(e.target.value)}
                                isInvalid={tocado && !!errores.fecha}
                            />
                            <Form.Control.Feedback type='invalid'>{errores.fecha}</Form.Control.Feedback>
                        </Form.Group>
                    </div>

                    <Form.Group className={s.campo} controlId='reserva-cliente-horarios'>
                        {fecha && (
                            <Form.Label className='text-label-md'>Horarios disponibles</Form.Label>
                        )}
                        
                        {!fecha && (
                            <Form.Text className='text-body-sm'>
                                Elegí una fecha para ver los horarios disponibles.
                            </Form.Text>
                        )}

                        {cargandoHorarios && (
                            <p className='text-body-sm mb-0 d-flex align-items-center gap-2'>
                                <Spinner size='sm' animation='border' />
                                Cargando horarios…
                            </p>
                        )}

                        {errorHorarios && (
                            <div className='text-body-sm'>
                                <span className='d-block mb-2'>{errorHorarios}</span>
                                <Button
                                    type='button'
                                    variant='outline-secondary'
                                    size='sm'
                                    className='text-label-sm'
                                    onClick={() => setReintento(valor => valor + 1)}
                                >
                                    Reintentar
                                </Button>
                            </div>
                        )}

                        {fecha && !cargandoHorarios && !errorHorarios && slots.length === 0 && (
                            <Form.Text className='text-body-sm'>
                                No hay horarios para esa fecha.
                            </Form.Text>
                        )}

                        {slots.length > 0 && (
                            <div className={s.grilla} role='group' aria-label='Horarios disponibles'>
                                {slots.map(slot => {
                                    const motivo = motivoDeshabilitado(slot)
                                    const seleccionado = slot.hora === hora && motivo === null
                                    return (
                                        <button
                                            key={slot.hora}
                                            type='button'
                                            className={s.slot}
                                            aria-pressed={seleccionado}
                                            disabled={motivo !== null}
                                            title={motivo ?? undefined}
                                            onClick={() => setHora(slot.hora)}
                                        >
                                            {slot.hora}
                                        </button>
                                    )
                                })}
                            </div>
                        )}

                        {tocado && errores.hora && slots.length > 0 && (
                            <Form.Text className='text-body-sm text-danger d-block'>
                                {errores.hora}
                            </Form.Text>
                        )}

                        {slotSeleccionado && (
                            <div className={`text-body-sm ${s.detalleSlot}`}>
                                <span className='d-block'>
                                    Aforo libre para las {slotSeleccionado.hora}:{' '}
                                    <strong>{slotSeleccionado.aforo_disponible} personas</strong>
                                </span>
                                {slotSeleccionado.disponible.length > 0 ? (
                                    <ul className='mb-0 ps-3'>
                                        {slotSeleccionado.disponible.map(fila => (
                                            <li key={fila.capacidad}>
                                                Combinaciones de {fila.capacidad} lugares × {fila.cantidad}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <span className='d-block'>
                                        No quedan combinaciones libres para ese horario; probá
                                        con otro.
                                    </span>
                                )}
                            </div>
                        )}
                    </Form.Group>

                    <PreordenCliente
                        lineas={lineasPreorden}
                        onChange={setLineasPreorden}
                        disabled={enviando}
                    />

                    <Button
                        type='submit'
                        variant='primary'
                        className={`text-label-lg ${s.botonEnviar}`}
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
                                ¡Listo! Tu reserva quedó registrada.
                            </p>
                            <div className={s.pinBox}>
                                <div>
                                    <p className={`text-label-sm ${s.pinEtiqueta}`}>Código reserva (PIN)</p>
                                    <p className={`text-headline-md ${s.pinValor}`}>{pinReserva}</p>
                                </div>
                                <Button
                                    size='sm'
                                    variant={copiado ? 'success' : 'outline-secondary'}
                                    className='text-label-md'
                                    type='button'
                                    onClick={handlerCopiar}
                                >
                                    <i className={`bi ${copiado ? 'bi-check2' : 'bi-clipboard'} me-1`} aria-hidden='true' />
                                    {copiado ? 'Copiado' : 'Copiar'}
                                </Button>
                                <p className={`text-body-sm ${s.exitoNota}`}>
                                    Presentá este código al llegar al restaurante.
                                </p>
                            </div>
                            <ul className={s.exitoDatos}>
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
                            </ul>
                            {lineasPreorden.length > 0 && (
                                <div className={s.preordenBox}>
                                    <p className={`text-label-sm ${s.preordenTitulo}`}>Tu pre-orden</p>
                                    <p className={`text-body-sm ${s.preordenTexto}`}>
                                        {cantidadPreorden}{' '}
                                        {cantidadPreorden === 1 ? 'plato elegido' : 'platos elegidos'}
                                        : llegando a la mesa se envían solos a cocina.
                                    </p>
                                    <p className={`text-body-sm ${s.preordenTexto} mb-0`}>
                                        ¿Querés cambiar algo? Modificala con tu PIN desde{' '}
                                        <Link to='/preorden'>Pre-orden</Link>.
                                    </p>
                                </div>
                            )}
                            <p className={`text-body-sm ${s.exitoNota}`}>
                                Guardá el código de tu reserva y mostráselo al local.
                            </p>
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button
                        variant='outline-primary'
                        className='text-label-md'
                        type='button'
                        onClick={descargarComprobante}
                        >
                        <i className='bi bi-download me-1' aria-hidden='true' />
                        Descargar Comprobante
                    </Button>
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

            {/* QR fuera de pantalla: alimenta al comprobante PDF. */}
            <div
                className='no-print'
                style={{ position: 'fixed', left: -99999, top: 0 }}
                aria-hidden='true'
            >
                <QRCodeCanvas
                    ref={qrRef}
                    value={`${window.location.origin}/preorden`}
                    size={512}
                    level='M'
                />
            </div>
        </div>
    )
}
