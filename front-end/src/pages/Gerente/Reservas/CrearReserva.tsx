import { useState } from 'react'
import { Alert, Button, Form, Spinner } from 'react-bootstrap'
import { solicitarReservaWeb } from '../../../api/cliente'
import { hoyLocal, reservaWebSchema } from '../../../schemas/cliente'
import { useAhora } from '../../../hooks/useAhora'
import { useHorariosReserva } from '../../../hooks/useHorariosReserva'
import { ExitoModal } from '../../../components/Modales/ExitoModal'
import { GrillaHorarios } from '../../../components/Reservas/GrillaHorarios'
import { DetalleSlotHorario } from '../../../components/Reservas/DetalleSlotHorario'
import { ANTICIPACION_HORAS_POR_DEFECTO } from '../../../utils/horariosReserva'

import type { Reserva } from '../../../types/Reserva'
import s from './Reservas.module.css'
// import { getConfiguracion } from '../../../api/configuracion'
import { useLocation, useNavigate } from 'react-router-dom'
import { baseReservas } from '../../../navigation/rutas'

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

// Alta de reserva para el staff (Gerente y Mozo): reusa el alta pública
// POST /cliente/reservas. NO se elige mesa: es por personas + fecha +
// horario y el backend asigna una combinación de capacidades del
// CONFIG_MESA. Los turnos y la anticipación salen de
// GET /cliente/reservas/disponibilidad-dia (configuración del backend).
export function CrearReservaPage() {
    const navigate = useNavigate()
    // Se sirve bajo /gerente/reservas (Gerente) y /mozo/reservas (Mozo).
    const base = baseReservas(useLocation().pathname)
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
    // const [aforoInfo, setAforoInfo] = useState<string | null>(null)

    const [enviando, setEnviando] = useState(false)
    const [errorApi, setErrorApi] = useState<string | null>(null)
    const [reservaCreada, setReservaCreada] = useState<Reserva | null>(null)
    const [tocado, setTocado] = useState(false)
    const [copiado, setCopiado] = useState(false)

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

    // useEffect(() => {
    //     const controller = new AbortController()
    //     getConfiguracion(controller.signal)
    //         .then(config => {
    //             setAforoInfo(`Salón: aforo ${config.aforo} personas · hasta ${config.mesas_maximas} mesas`)
    //         })
    //         .catch(() => {
    //             // Sin aforo de referencia no se bloquea el alta.
    //         })
    //     return () => controller.abort()
    // }, [])

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
            await navigator.clipboard.writeText(pinReserva(reservaCreada))
            setCopiado(true)
        } catch {
            setCopiado(false)
        }
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
    }

    return (
        <div className={s.pagina}>
            <section className={s.tarjeta}>
                <h1 className={`text-headline-md ${s.title}`}>Nueva reserva</h1>
                {errorApi && <Alert variant='danger' className='text-body-md alerta'>{errorApi}</Alert>}
                            {/* {aforoInfo && (
                <p className={`text-body-sm ${s.subtitle}`}>{aforoInfo}</p>
            )} */}
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
            </section>

            <ExitoModal
                show={reservaCreada !== null}
                titulo='Reserva pedida'
                mensaje='¡Listo! La reserva quedó registrada.'
                datos={reservaCreada
                    ? [
                        { etiqueta: 'Fecha', valor: formatearFechaLarga(reservaCreada.fecha) },
                        { etiqueta: 'Hora', valor: `${reservaCreada.hora} hs` },
                        { etiqueta: 'Personas', valor: String(reservaCreada.cantPersonas) },
                    ]
                    : []}
                onSeguir={cerrarExito}
                onListo={() => navigate(base)}
            >
                {reservaCreada && (
                    <div className={`${s.pinBox} mt-3`}>
                        <div>
                            <p className={`text-label-sm ${s.pinEtiqueta}`}>Código reserva (PIN)</p>
                            <p className={`text-headline-md ${s.pinValor}`}>{pinReserva(reservaCreada)}</p>
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
                            Este código te debe dar el cliente cuando venga
                        </p>
                    </div>
                )}
            </ExitoModal>
        </div>
    )
}
