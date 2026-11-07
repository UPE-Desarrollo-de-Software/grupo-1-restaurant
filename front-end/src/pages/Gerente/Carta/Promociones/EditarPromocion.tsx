import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Alert, Button, Card, Form, Spinner } from 'react-bootstrap'
import s from './Promociones.module.css'
import { promocionSchema } from '../../../../schemas/carta'
import { deletePromocion, getPromocion, updatePromocion } from '../../../../api/promociones'
import { ZonaPeligro } from '../../../../components/ZonaPeligro/ZonaPeligro'
import type { TipoPromocion } from '../../../../types/Menu'

const TIPOS: { value: TipoPromocion; label: string }[] = [
    { value: 'porcentaje', label: 'Porcentaje (%)' },
    { value: 'monto_fijo', label: 'Monto fijo ($)' },
    { value: 'precio_fijo', label: 'Precio fijo ($)' },
    { value: '2x1', label: '2x1' },
]

export function EditarPromocionPage() {
    const { id } = useParams()
    const navigate = useNavigate()

    const [nombre, setNombre] = useState('')
    const [tipo, setTipo] = useState<TipoPromocion | ''>('')
    const [valor, setValor] = useState('')
    const [fechaInicio, setFechaInicio] = useState('')
    const [fechaFin, setFechaFin] = useState('')
    const [activo, setActivo] = useState(true)

    const [cargando, setCargando] = useState(true)
    const [enviando, setEnviando] = useState(false)
    const [eliminando, setEliminando] = useState(false)
    const [errorApi, setErrorApi] = useState<string | null>(null)
    const [exito, setExito] = useState<string | null>(null)
    const [tocado, setTocado] = useState(false)

    useEffect(() => {
        const controller = new AbortController()
        getPromocion(Number(id), controller.signal)
            .then(promocion => {
                setNombre(promocion.nombre)
                setTipo(promocion.tipo)
                setValor(promocion.valor === null ? '' : String(promocion.valor))
                setFechaInicio(promocion.fecha_inicio ?? '')
                setFechaFin(promocion.fecha_fin ?? '')
                setActivo(promocion.activo)
            })
            .catch(err => {
                if (!controller.signal.aborted) {
                    setErrorApi(err instanceof Error ? err.message : 'Error desconocido al cargar la promoción')
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) setCargando(false)
            })
        return () => controller.abort()
    }, [id])

    const errores: Record<string, string> = {}
    const resultados = promocionSchema.safeParse({
        nombre,
        tipo: tipo || undefined,
        valor,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        activo,
    })
    if (!resultados.success) {
        for (const issue of resultados.error.issues) {
            const campo = issue.path[0]
            if (typeof campo === 'string' && !errores[campo]) {
                errores[campo] = issue.message
            }
        }
    }

    async function handlerSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setTocado(true)
        setExito(null)
        setErrorApi(null)

        if (!resultados.success) return

        setEnviando(true)
        try {
            await updatePromocion(Number(id), resultados.data)
            setExito('Promoción actualizada exitosamente')
            setTocado(false)
        } catch (err) {
            setErrorApi(err instanceof Error ? err.message : 'Error desconocido al actualizar la promoción')
        } finally {
            setEnviando(false)
        }
    }

    async function handlerEliminar() {
        setEliminando(true)
        setErrorApi(null)
        setExito(null)
        try {
            await deletePromocion(Number(id))
            navigate('/gerente/carta/promociones')
        } catch (err) {
            // La regla del backend ("ya se aplicó en pedidos: desactivala")
            // llega como 422 y se muestra tal cual en la Alert.
            setErrorApi(err instanceof Error ? err.message : 'Error desconocido al eliminar la promoción')
        } finally {
            setEliminando(false)
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
                <h1 className={`text-headline-md ${s.title}`}>Editar promoción</h1>
                <p className={`text-body-sm ${s.subtitle}`}>Modificá los datos, la ventana de fechas o el estado de la promoción.</p>

                {exito && (
                    <Alert variant='success' className='text-body-md d-flex flex-wrap align-items-center justify-content-between gap-2'>
                        <span>{exito}</span>
                        <Button
                            className='text-label-md'
                            variant='outline-success'
                            size='sm'
                            type='button'
                            onClick={() => navigate('/gerente/carta/promociones')}
                        >
                            Volver a la lista
                        </Button>
                    </Alert>
                )}
                {errorApi && <Alert variant='danger' className='text-body-md'>{errorApi}</Alert>}

                <Form onSubmit={handlerSubmit} noValidate>
                    <div className={s.row}>
                        <Form.Group className={s.field} controlId='editar-promocion-nombre'>
                            <Form.Label className={`text-label-md ${s.label}`}>Nombre</Form.Label>
                            <Form.Control
                                className={s.input}
                                type='text'
                                placeholder='20% de descuento en postres'
                                value={nombre}
                                onChange={(e) => setNombre(e.target.value)}
                                isInvalid={tocado && !!errores.nombre}
                            />
                            <Form.Control.Feedback type='invalid'>{errores.nombre}</Form.Control.Feedback>
                        </Form.Group>

                        <Form.Group className={s.field} controlId='editar-promocion-tipo'>
                            <Form.Label className={`text-label-md ${s.label}`}>Tipo</Form.Label>
                            <Form.Select
                                className={s.input}
                                value={tipo}
                                onChange={(e) => setTipo(e.target.value as TipoPromocion | '')}
                                isInvalid={tocado && !!errores.tipo}
                            >
                                <option value='' disabled={true}>Seleccioná un tipo</option>
                                {TIPOS.map(tipoOpcion => (
                                    <option value={tipoOpcion.value} key={tipoOpcion.value}>{tipoOpcion.label}</option>
                                ))}
                            </Form.Select>
                            <Form.Control.Feedback type='invalid'>{errores.tipo}</Form.Control.Feedback>
                        </Form.Group>
                    </div>

                    <div className={s.row}>
                        {tipo !== '2x1' && (
                            <Form.Group className={s.field} controlId='editar-promocion-valor'>
                                <Form.Label className={`text-label-md ${s.label}`}>
                                    {tipo === 'porcentaje' ? 'Valor (%)' : 'Valor ($)'}
                                </Form.Label>
                                <Form.Control
                                    className={s.input}
                                    type='number'
                                    step='any'
                                    min={0}
                                    placeholder={tipo === 'porcentaje' ? '15' : '500'}
                                    value={valor}
                                    onChange={(e) => setValor(e.target.value)}
                                    isInvalid={tocado && !!errores.valor}
                                />
                                <Form.Control.Feedback type='invalid'>{errores.valor}</Form.Control.Feedback>
                            </Form.Group>
                        )}

                        <Form.Group className={s.field} controlId='editar-promocion-fecha-inicio'>
                            <Form.Label className={`text-label-md ${s.label}`}>Fecha de inicio (opcional)</Form.Label>
                            <Form.Control
                                className={s.input}
                                type='date'
                                value={fechaInicio}
                                onChange={(e) => setFechaInicio(e.target.value)}
                                isInvalid={tocado && !!errores.fecha_inicio}
                            />
                            <Form.Control.Feedback type='invalid'>{errores.fecha_inicio}</Form.Control.Feedback>
                        </Form.Group>

                        <Form.Group className={s.field} controlId='editar-promocion-fecha-fin'>
                            <Form.Label className={`text-label-md ${s.label}`}>Fecha de fin (opcional)</Form.Label>
                            <Form.Control
                                className={s.input}
                                type='date'
                                value={fechaFin}
                                onChange={(e) => setFechaFin(e.target.value)}
                                isInvalid={tocado && !!errores.fecha_fin}
                            />
                            <Form.Control.Feedback type='invalid'>{errores.fecha_fin}</Form.Control.Feedback>
                        </Form.Group>
                    </div>

                    <Form.Group className={s.field} controlId='editar-promocion-activo'>
                        <div className={s.switchWrap}>
                            <Form.Check
                                type='switch'
                                id='editar-promocion-activo-switch'
                                checked={activo}
                                onChange={(e) => setActivo(e.target.checked)}
                            />
                            <Form.Label className={`text-label-md ${s.label} mb-0`}>Activa</Form.Label>
                        </div>
                    </Form.Group>

                    <div className={s.actions}>
                        <Button className={s.button} variant='primary' type='submit' disabled={enviando || cargando}>
                            {enviando
                                ? <><Spinner size='sm' animation='border' className='me-2' />Guardando...</>
                                : 'Guardar cambios'}
                        </Button>
                        <Button
                            className={s.button}
                            variant='outline-secondary'
                            type='button'
                            disabled={enviando}
                            onClick={() => navigate('/gerente/carta/promociones')}
                        >
                            Cancelar edición
                        </Button>
                    </div>
                </Form>
            </Card>

            <div className={s.zonaWrap}>
                <ZonaPeligro
                    descripcion='Eliminar esta promoción la borra del sistema de forma permanente. Si ya se aplicó en pedidos no podrá eliminarse: en ese caso usá el interruptor de arriba para desactivarla.'
                    textoBoton='Eliminar promoción'
                    eliminando={eliminando}
                    onEliminar={handlerEliminar}
                />
            </div>
        </div>
    )
}
