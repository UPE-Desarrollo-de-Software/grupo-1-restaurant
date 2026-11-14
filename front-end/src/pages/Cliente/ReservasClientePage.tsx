import { useRef, useState } from 'react'
import { Alert, Button, Form, Modal, Spinner } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import { QRCodeCanvas } from 'qrcode.react'
import { solicitarReservaWeb } from '../../api/cliente'
import { hoyLocal, reservaWebSchema } from '../../schemas/cliente'
import { useAhora } from '../../hooks/useAhora'
import { useHorariosReserva } from '../../hooks/useHorariosReserva'
import { GrillaHorarios } from '../../components/Reservas/GrillaHorarios'
import { DetalleSlotHorario } from '../../components/Reservas/DetalleSlotHorario'
import { PreordenCliente } from '../../components/Cliente/PreordenCliente'
import { descargarComprobanteReserva } from '../../utils/comprobanteReserva'
import { ANTICIPACION_HORAS_POR_DEFECTO } from '../../utils/horariosReserva'
import type { LineaPreorden, Reserva } from '../../types/Reserva'
import s from './ReservasClientePage.module.css'

function formatearFechaLarga(fecha: string): string {
    const fechaDate = new Date(`${fecha}T00:00:00`)
    if (Number.isNaN(fechaDate.getTime())) return fecha
    return fechaDate.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
}

// Reservas del cliente (público, sin login): POST /cliente/reservas.
// NO se elige mesa: es por personas + fecha + horario y el backend
// asigna una combinación de capacidades del CONFIG_MESA. Los turnos y la
// anticipación salen de GET /cliente/reservas/disponibilidad-dia: la
// ventana la configura el gerente en el backend, el front no la replica.
export function ReservasClientePage() {
    const [nombreApellido, setNombreApellido] = useState('')
    const [fecha, setFecha] = useState('')
    const [hora, setHora] = useState('')
    const [cantPersonas, setCantPersonas] = useState('')

    // const [codigo, setCodigo] = useState<string | null>(null)

    // Grilla de turnos del día (ventana + anticipación + aforo libre). La
    // comparten los tres flujos de alta: el hook cachea por fecha y el
    // backend define los horarios.
    const {
        datos: diaHorarios,
        cargando: cargandoHorarios,
        error: errorHorarios,
        slots,
        reintentar,
        limpiar,
    } = useHorariosReserva(fecha)

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

    // Contexto de la grilla: la anticipación la manda el backend
    // (`horarios.anticipacion_horas`); el valor de respaldo sólo cubre un
    // backend previo a la configuración centralizada.
    const contextoSlot = {
        fecha,
        horaActual: ahora,
        anticipacionHoras: diaHorarios?.horarios?.anticipacion_horas ?? ANTICIPACION_HORAS_POR_DEFECTO,
        personasValidas,
        personas,
    }

    const slotSeleccionado = slots.find(slot => slot.hora === hora) ?? null

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
        limpiar()
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
                            <Form.Label className='text-label-md'>
                                Horarios disponibles
                                {diaHorarios?.horarios
                                    ? ` (${diaHorarios.horarios.inicio} a ${diaHorarios.horarios.fin})`
                                    : ''}
                            </Form.Label>
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
                                    onClick={reintentar}
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
                            <GrillaHorarios
                                slots={slots}
                                seleccionada={hora}
                                contexto={contextoSlot}
                                onSeleccionar={setHora}
                            />
                        )}

                        {tocado && errores.hora && slots.length > 0 && (
                            <Form.Text className='text-body-sm text-danger d-block'>
                                {errores.hora}
                            </Form.Text>
                        )}

                        <DetalleSlotHorario slot={slotSeleccionado} />
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
