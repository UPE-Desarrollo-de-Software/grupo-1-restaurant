import { useEffect, useState } from 'react'
import { Alert, Button, Card, Form, Spinner } from 'react-bootstrap'
import s from './Mesas.module.css'
import { configMesaFilaSchema, disponibilidadReservaSchema } from '../../../schemas/configuracion'
import {
    getConfiguracion,
    getDisponibilidadReservas,
    updateConfiguracion,
    updateDisponibilidadReservas,
} from '../../../api/configuracion'
import type { ConfigMesaFilaInput } from '../../../schemas/configuracion'
import type { DisponibilidadReservas } from '../../../types/Configuracion'
import { generarTurnos } from '../../../utils/horariosReserva'
import GastroLoader from '../../../components/GastroLoader/GastroLoader'

interface FilaForm {
    capacidad: string
    cantidad: string
}

// Intervalos que admite el backend (DisponibilidadReservaService).
const INTERVALOS = [15, 30, 45, 60]

// CONFIG_MESA: composición del salón (capacidad × cantidad) que define
// el AFORO (Σ capacidad×cantidad = personas simultáneas máximas) y el
// tope de mesas (Σ cantidad). PUT /configuracion es replace-all; la
// regla "no bajar el aforo bajo las mesas vivas" es 422 del backend.
//
// Además administra la VENTANA DE TURNOS DE RESERVAS (horarios que
// ofrecen los tres flujos de alta). OJO: esa configuración NO vive en la
// base de datos; el backend la guarda en un archivo de runtime (ver el
// aviso de la propia sección).
export function ConfiguracionMesaPage() {
    const [filas, setFilas] = useState<FilaForm[] | null>(null)
    // Último estado guardado de la CONFIG_MESA: "Cancelar" restaura esto,
    // así desaparecen las filas agregadas con "Agregar mesas" que todavía
    // no se persistieron y las existentes vuelven a su valor guardado.
    const [filasGuardadas, setFilasGuardadas] = useState<FilaForm[]>([])
    const [errorCarga, setErrorCarga] = useState<string | null>(null)
    const [enviando, setEnviando] = useState(false)
    const [errorApi, setErrorApi] = useState<string | null>(null)
    const [exito, setExito] = useState<string | null>(null)
    const [tocado, setTocado] = useState(false)

    // ==== Horarios de reserva (ventana de turnos) ====
    const [disponibilidad, setDisponibilidad] = useState<DisponibilidadReservas | null>(null)
    const [errorDisponibilidad, setErrorDisponibilidad] = useState<string | null>(null)
    const [horaInicio, setHoraInicio] = useState('')
    const [horaFin, setHoraFin] = useState('')
    const [intervalo, setIntervalo] = useState('30')
    const [enviandoHorarios, setEnviandoHorarios] = useState(false)
    const [errorHorarios, setErrorHorarios] = useState<string | null>(null)
    const [exitoHorarios, setExitoHorarios] = useState<string | null>(null)
    const [tocadoHorarios, setTocadoHorarios] = useState(false)

    useEffect(() => {
        const controller = new AbortController()
        getConfiguracion(controller.signal)
            .then(config => {
                const cargadas = config.config_mesas.map(fila => ({
                    capacidad: String(fila.capacidad),
                    cantidad: String(fila.cantidad),
                }))
                const iniciales = cargadas.length > 0 ? cargadas : [{ capacidad: '', cantidad: '' }]
                setFilas(iniciales)
                setFilasGuardadas(iniciales)
                setErrorCarga(null)
            })
            .catch(err => {
                if (!controller.signal.aborted) {
                    setErrorCarga(err instanceof Error ? err.message : 'Error desconocido al cargar la configuración')
                }
            })
        return () => controller.abort()
    }, [])

    useEffect(() => {
        const controller = new AbortController()
        getDisponibilidadReservas(controller.signal)
            .then(disponibilidadActual => {
                setDisponibilidad(disponibilidadActual)
                setHoraInicio(disponibilidadActual.hora_inicio)
                setHoraFin(disponibilidadActual.hora_fin)
                setIntervalo(String(disponibilidadActual.intervalo_minutos))
                setErrorDisponibilidad(null)
            })
            .catch(err => {
                if (!controller.signal.aborted) {
                    setErrorDisponibilidad(
                        err instanceof Error ? err.message : 'Error desconocido al cargar los horarios de reserva'
                    )
                }
            })
        return () => controller.abort()
    }, [])

    const cargando = filas === null && errorCarga === null

    // Derivados en vivo (con lo que se pueda parsear como entero).
    const aforoDerivado = (filas ?? []).reduce(
        (acc, fila) => acc + (Number(fila.capacidad) || 0) * (Number(fila.cantidad) || 0), 0
    )
    const mesasDerivadas = (filas ?? []).reduce(
        (acc, fila) => acc + (Number(fila.cantidad) || 0), 0
    )

    // Errores por fila (índice-campo) con el mismo schema del PUT.
    const errores: Record<string, string> = {}
    const filasParseadas: ConfigMesaFilaInput[] = []
    for (const [indice, fila] of (filas ?? []).entries()) {
        const resultado = configMesaFilaSchema.safeParse(fila)
        if (resultado.success) {
            filasParseadas.push(resultado.data)
        } else {
            for (const issue of resultado.error.issues) {
                const campo = issue.path[0]
                if (typeof campo === 'string' && !errores[`${indice}-${campo}`]) {
                    errores[`${indice}-${campo}`] = issue.message
                }
            }
        }
    }
    const filasValidas = filas !== null && filas.length > 0 && filasParseadas.length === filas.length

    // Validación de la ventana con el mismo schema del PUT.
    const resultadoHorarios = disponibilidadReservaSchema.safeParse({
        hora_inicio: horaInicio,
        hora_fin: horaFin,
        intervalo_minutos: intervalo,
    })
    const erroresHorarios: Record<string, string> = {}
    if (!resultadoHorarios.success) {
        for (const issue of resultadoHorarios.error.issues) {
            const campo = issue.path[0]
            if (typeof campo === 'string' && !erroresHorarios[campo]) {
                erroresHorarios[campo] = issue.message
            }
        }
    }

    // Vista previa local de la grilla (sólo para ver qué se va a ofrecer;
    // la grilla real la devuelve el backend al guardar).
    const turnosPrevistos = generarTurnos(horaInicio, horaFin, Number(intervalo))

    function modificarFila(indice: number, campo: 'capacidad' | 'cantidad', valor: string) {
        setFilas(prev => prev === null ? prev : prev.map((fila, i) =>
            i === indice ? { ...fila, [campo]: valor } : fila
        ))
    }

    function agregarFila() {
        setFilas(prev => prev === null ? prev : [...prev, { capacidad: '', cantidad: '' }])
    }

    function quitarFila(indice: number) {
        setFilas(prev => prev === null ? prev : prev.filter((_, i) => i !== indice))
    }

    // Descarta lo no guardado: vuelve al snapshot persistido (las filas
    // nuevas sin guardar desaparecen; las existentes recuperan su valor).
    function cancelarCambios() {
        if (filasGuardadas.length === 0) return
        setFilas(filasGuardadas)
        setTocado(false)
        setExito(null)
        setErrorApi(null)
    }

    async function handlerSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setTocado(true)
        setExito(null)
        setErrorApi(null)
        if (!filasValidas) return

        setEnviando(true)
        try {
            const actualizada = await updateConfiguracion(filasParseadas)
            const strings = actualizada.config_mesas.map(fila => ({
                capacidad: String(fila.capacidad),
                cantidad: String(fila.cantidad),
            }))
            const guardadas = strings.length > 0 ? strings : [{ capacidad: '', cantidad: '' }]
            setFilas(guardadas)
            setFilasGuardadas(guardadas)
            setExito(
                `Configuración actualizada: aforo ${actualizada.aforo} personas · ${actualizada.mesas_maximas} mesas máximas.`
            )
            setTocado(false)
        } catch (err) {
            // 422 del back ("No se puede bajar el aforo…") llega tal cual.
            setErrorApi(err instanceof Error ? err.message : 'Error desconocido al actualizar la configuración')
        } finally {
            setEnviando(false)
        }
    }

    async function handlerSubmitHorarios(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setTocadoHorarios(true)
        setExitoHorarios(null)
        setErrorHorarios(null)
        if (!resultadoHorarios.success) return

        setEnviandoHorarios(true)
        try {
            const actualizada = await updateDisponibilidadReservas(resultadoHorarios.data)
            setDisponibilidad(actualizada)
            setHoraInicio(actualizada.hora_inicio)
            setHoraFin(actualizada.hora_fin)
            setIntervalo(String(actualizada.intervalo_minutos))
            setExitoHorarios(
                `Horarios actualizados: ${actualizada.total_slots} turnos de ${actualizada.hora_inicio} a ${actualizada.hora_fin}.`
            )
            setTocadoHorarios(false)
        } catch (err) {
            // 422 del back (rango inválido) llega con {message} en español.
            setErrorHorarios(err instanceof Error ? err.message : 'Error desconocido al actualizar los horarios')
        } finally {
            setEnviandoHorarios(false)
        }
    }

    if (cargando) {
        return (
            <div className={s.page}>
                <Card className={s.card}>
                    <div className='d-flex justify-content-center py-4'>
                        <GastroLoader messages={['Cargando configuración…']} size={96} />
                    </div>
                </Card>
            </div>
        )
    }

    return (
        <div className={s.page}>
            <Card className={s.card}>
                <h1 className={`text-headline-md ${s.title}`}>Configuración del salón</h1>

                {exito && <Alert variant='success' className='text-body-md'>{exito}</Alert>}
                {errorApi && <Alert variant='danger' className='text-body-md'>{errorApi}</Alert>}
                {errorCarga && <Alert variant='danger' className='text-body-md'>{errorCarga}</Alert>}

                {filas !== null && filas.length === 0 && !errorCarga && (
                    <Alert variant='warning' className='text-body-md'>
                        La configuración no tiene filas: agregá al menos una.
                    </Alert>
                )}

                <Form onSubmit={handlerSubmit} noValidate>
                    <div className={s.configFilas}>
                        {filas?.map((fila, indice) => (
                            <div className={s.configFila} key={indice}>
                                <Form.Group controlId={`config-capacidad-${indice}`}>
                                    <Form.Label className={`text-label-md ${s.label}`}>Lugares por mesa</Form.Label>
                                    <Form.Control
                                        className={s.input}
                                        type='number'
                                        min={1}
                                        step={1}
                                        placeholder='4'
                                        value={fila.capacidad}
                                        onChange={(e) => modificarFila(indice, 'capacidad', e.target.value)}
                                        isInvalid={tocado && !!errores[`${indice}-capacidad`]}
                                    />
                                    <Form.Control.Feedback type='invalid'>
                                        {errores[`${indice}-capacidad`]}
                                    </Form.Control.Feedback>
                                </Form.Group>

                                <Form.Group controlId={`config-cantidad-${indice}`}>
                                    <Form.Label className={`text-label-md ${s.label}`}>Cantidad de mesas</Form.Label>
                                    <Form.Control
                                        className={s.input}
                                        type='number'
                                        min={1}
                                        step={1}
                                        placeholder='25'
                                        value={fila.cantidad}
                                        onChange={(e) => modificarFila(indice, 'cantidad', e.target.value)}
                                        isInvalid={tocado && !!errores[`${indice}-cantidad`]}
                                    />
                                    <Form.Control.Feedback type='invalid'>
                                        {errores[`${indice}-cantidad`]}
                                    </Form.Control.Feedback>
                                </Form.Group>

                                <Button
                                    size='sm'
                                    variant='outline-danger'
                                    className={`${s.deleteBtn} text-label-md`}
                                    type='button'
                                    disabled={(filas?.length ?? 0) <= 1 || enviando}
                                    title={(filas?.length ?? 0) <= 1 ? 'Debe quedar al menos una fila' : 'Quitar fila'}
                                    onClick={() => quitarFila(indice)}
                                    aria-label={`Quitar fila de ${fila.capacidad || '?'} lugares`}
                                >
                                    <i className='bi bi-trash' aria-hidden='true' />
                                </Button>
                            </div>
                        ))}
                    </div>

                    <div className={s.accionesFilas}>
                        <Button
                            size='sm'
                            variant='outline-primary'
                            className='text-label-md'
                            type='button'
                            disabled={enviando}
                            onClick={agregarFila}
                        >
                            <i className='bi bi-plus-lg me-1' aria-hidden='true' />
                            Agregar mesas
                        </Button>
                    </div>

                    <div className={s.configDerivados}>
                        <span className='text-body-md'>
                            Aforo resultante: <strong>{aforoDerivado}</strong> personas
                        </span>
                        <span className='text-body-md'>
                            Mesas máximas: <strong>{mesasDerivadas}</strong>
                        </span>
                    </div>

                    <div className={s.actions}>
                        <Button className='text-label-md' variant='primary' type='submit' disabled={enviando}>
                            {enviando
                                ? <><Spinner size='sm' animation='border' className='me-2' />Guardando...</>
                                : 'Guardar cambios'}
                        </Button>
                        <Button
                            className='text-label-md'
                            variant='outline-secondary'
                            type='button'
                            disabled={enviando || filasGuardadas.length === 0}
                            onClick={cancelarCambios}
                        >
                            Cancelar
                        </Button>
                    </div>
                </Form>

                <section className={s.horariosSeccion}>
                    <h2 className={`text-headline-sm ${s.horariosTitulo}`}>Horarios de reserva</h2>
                    <p className={`text-body-sm ${s.horariosSubtitle}`}>
                        Turnos que se ofrecen al cliente y al personal al crear una reserva.
                    </p>

                    {exitoHorarios && <Alert variant='success' className='text-body-md'>{exitoHorarios}</Alert>}
                    {errorHorarios && <Alert variant='danger' className='text-body-md'>{errorHorarios}</Alert>}
                    {errorDisponibilidad && (
                        <Alert variant='danger' className='text-body-md'>{errorDisponibilidad}</Alert>
                    )}

                    <Form onSubmit={handlerSubmitHorarios} noValidate>
                        <div className={s.horariosGrid}>
                            <Form.Group controlId='reserva-hora-inicio'>
                                <Form.Label className={`text-label-md ${s.label}`}>Hora de apertura</Form.Label>
                                <Form.Control
                                    className={s.input}
                                    type='time'
                                    value={horaInicio}
                                    onChange={(e) => setHoraInicio(e.target.value)}
                                    isInvalid={tocadoHorarios && !!erroresHorarios.hora_inicio}
                                />
                                <Form.Control.Feedback type='invalid'>
                                    {erroresHorarios.hora_inicio}
                                </Form.Control.Feedback>
                            </Form.Group>

                            <Form.Group controlId='reserva-hora-fin'>
                                <Form.Label className={`text-label-md ${s.label}`}>Hora de cierre</Form.Label>
                                <Form.Control
                                    className={s.input}
                                    type='time'
                                    value={horaFin}
                                    onChange={(e) => setHoraFin(e.target.value)}
                                    isInvalid={tocadoHorarios && !!erroresHorarios.hora_fin}
                                />
                                <Form.Control.Feedback type='invalid'>
                                    {erroresHorarios.hora_fin}
                                </Form.Control.Feedback>
                            </Form.Group>

                            <Form.Group controlId='reserva-intervalo'>
                                <Form.Label className={`text-label-md ${s.label}`}>Intervalo entre turnos</Form.Label>
                                <Form.Select
                                    className={s.input}
                                    value={intervalo}
                                    onChange={(e) => setIntervalo(e.target.value)}
                                    isInvalid={tocadoHorarios && !!erroresHorarios.intervalo_minutos}
                                >
                                    {INTERVALOS.map(minutos => (
                                        <option key={minutos} value={minutos}>{minutos} minutos</option>
                                    ))}
                                </Form.Select>
                                <Form.Control.Feedback type='invalid'>
                                    {erroresHorarios.intervalo_minutos}
                                </Form.Control.Feedback>
                            </Form.Group>
                        </div>

                        <div className={s.horariosPreview}>
                            <p className={`text-body-sm ${s.horariosResumen}`}>
                                {turnosPrevistos.length > 0
                                    ? <>Se ofrecerán <strong>{turnosPrevistos.length}</strong> turnos, de <strong>{horaInicio}</strong> a <strong>{horaFin}</strong>.</>
                                    : 'Elegí una ventana válida para ver los turnos.'}
                            </p>
                            {turnosPrevistos.length > 0 && (
                                <div className={s.horariosChips}>
                                    {turnosPrevistos.map(turno => (
                                        <span key={turno} className={`text-label-sm ${s.horarioChip}`}>{turno}</span>
                                    ))}
                                </div>
                            )}
                            <p className={`text-body-sm ${s.horariosNota}`}>
                                Anticipación mínima: <strong>{disponibilidad?.anticipacion_horas ?? '—'} horas</strong>{' '}
                            </p>
                        </div>

                        <div className={s.actions}>
                            <Button
                                className='text-label-md'
                                variant='primary'
                                type='submit'
                                disabled={enviandoHorarios}
                            >
                                {enviandoHorarios
                                    ? <><Spinner size='sm' animation='border' className='me-2' />Guardando...</>
                                    : 'Guardar cambios'}
                            </Button>
                            <Button
                                className='text-label-md'
                                variant='outline-secondary'
                                type='button'
                                disabled={enviandoHorarios || disponibilidad === null}
                                onClick={() => {
                                    if (!disponibilidad) return
                                    setHoraInicio(disponibilidad.hora_inicio)
                                    setHoraFin(disponibilidad.hora_fin)
                                    setIntervalo(String(disponibilidad.intervalo_minutos))
                                    setTocadoHorarios(false)
                                    setErrorHorarios(null)
                                    setExitoHorarios(null)
                                }}
                            >
                                Cancelar
                            </Button>
                        </div>
                    </Form>
                </section>
            </Card>
        </div>
    )
}
