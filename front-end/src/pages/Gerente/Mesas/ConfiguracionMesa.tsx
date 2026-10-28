import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, Button, Card, Form, Spinner } from 'react-bootstrap'
import s from './Mesas.module.css'
import { configMesaFilaSchema } from '../../../schemas/configuracion'
import { getConfiguracion, updateConfiguracion } from '../../../api/configuracion'
import type { ConfigMesaFilaInput } from '../../../schemas/configuracion'

interface FilaForm {
    capacidad: string
    cantidad: string
}

// CONFIG_MESA: composición del salón (capacidad × cantidad) que define
// el AFORO (Σ capacidad×cantidad = personas simultáneas máximas) y el
// tope de mesas (Σ cantidad). PUT /configuracion es replace-all; la
// regla "no bajar el aforo bajo las mesas vivas" es 422 del backend.
export function ConfiguracionMesaPage() {
    const navigate = useNavigate()
    const [filas, setFilas] = useState<FilaForm[] | null>(null)
    const [errorCarga, setErrorCarga] = useState<string | null>(null)
    const [enviando, setEnviando] = useState(false)
    const [errorApi, setErrorApi] = useState<string | null>(null)
    const [exito, setExito] = useState<string | null>(null)
    const [tocado, setTocado] = useState(false)

    useEffect(() => {
        const controller = new AbortController()
        getConfiguracion(controller.signal)
            .then(config => {
                const cargadas = config.config_mesas.map(fila => ({
                    capacidad: String(fila.capacidad),
                    cantidad: String(fila.cantidad),
                }))
                setFilas(cargadas.length > 0 ? cargadas : [{ capacidad: '', cantidad: '' }])
                setErrorCarga(null)
            })
            .catch(err => {
                if (!controller.signal.aborted) {
                    setErrorCarga(err instanceof Error ? err.message : 'Error desconocido al cargar la configuración')
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
            setFilas(strings.length > 0 ? strings : [{ capacidad: '', cantidad: '' }])
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

    return (
        <div className={s.page}>
            <Card className={s.card}>
                <h1 className={`text-headline-md ${s.title}`}>Configuración del salón</h1>
                <p className={`text-body-sm ${s.subtitle}`}>
                    Definí las piezas del salón (capacidad × cantidad). El aforo es la cantidad
                    máxima de personas simultáneas: Σ capacidad × cantidad. Las mesas que se
                    creen se validan contra este aforo.
                </p>

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
                                    className='text-label-md'
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

                    <Button
                        size='sm'
                        variant='outline-primary'
                        className='text-label-md'
                        type='button'
                        disabled={enviando}
                        onClick={agregarFila}
                    >
                        <i className='bi bi-plus-lg me-1' aria-hidden='true' />
                        Agregar fila
                    </Button>

                    <div className={s.configDerivados}>
                        <span className='text-body-md'>
                            Aforo resultante: <strong>{aforoDerivado}</strong> personas
                        </span>
                        <span className='text-body-md'>
                            Mesas máximas: <strong>{mesasDerivadas}</strong>
                        </span>
                    </div>

                    <div className={s.actions}>
                        <Button className={s.button} variant='primary' type='submit' disabled={enviando}>
                            {enviando
                                ? <><Spinner size='sm' animation='border' className='me-2' />Guardando...</>
                                : 'Guardar configuración'}
                        </Button>
                        <Button
                            className={s.button}
                            variant='outline-secondary'
                            type='button'
                            disabled={enviando}
                            onClick={() => navigate('/gerente/mesas')}
                        >
                            Volver
                        </Button>
                    </div>
                </Form>
            </Card>
        </div>
    )
}
