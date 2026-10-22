import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, Button, Card, Form, Spinner } from 'react-bootstrap'
import s from './Promociones.module.css'
import { promocionSchema } from '../../../../schemas/carta'
import { createPromocion } from '../../../../api/promociones'
import type { TipoPromocion } from '../../../../types/Menu'

const TIPOS: { value: TipoPromocion; label: string }[] = [
    { value: 'porcentaje', label: 'Porcentaje (%)' },
    { value: 'monto_fijo', label: 'Monto fijo ($)' },
    { value: 'precio_fijo', label: 'Precio fijo ($)' },
    { value: '2x1', label: '2x1' },
]

export function CrearPromocionPage() {
    const navigate = useNavigate()
    const [nombre, setNombre] = useState('')
    const [tipo, setTipo] = useState<TipoPromocion | ''>('')
    const [valor, setValor] = useState('')
    const [fechaInicio, setFechaInicio] = useState('')
    const [fechaFin, setFechaFin] = useState('')
    const [activo, setActivo] = useState(true)

    const [enviando, setEnviando] = useState(false)
    const [errorApi, setErrorApi] = useState<string | null>(null)
    const [exito, setExito] = useState<string | null>(null)
    const [tocado, setTocado] = useState(false)

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
            await createPromocion(resultados.data)
            setExito('Promoción creada exitosamente')
            setNombre('')
            setTipo('')
            setValor('')
            setFechaInicio('')
            setFechaFin('')
            setActivo(true)
            setTocado(false)
        } catch (err) {
            setErrorApi(err instanceof Error ? err.message : 'Error desconocido al crear la promoción')
        } finally {
            setEnviando(false)
        }
    }

    return (
        <div className={s.page}>
            <Card className={s.card}>
                <h1 className={`text-headline-md ${s.title}`}>Nueva promoción</h1>
                <p className={`text-body-sm ${s.subtitle}`}>La promoción queda inactiva hasta que la actives y, si querés, asignala a un plato desde su edición.</p>

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
                        <Form.Group className={s.field} controlId='crear-promocion-nombre'>
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

                        <Form.Group className={s.field} controlId='crear-promocion-tipo'>
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
                            <Form.Group className={s.field} controlId='crear-promocion-valor'>
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

                        <Form.Group className={s.field} controlId='crear-promocion-fecha-inicio'>
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

                        <Form.Group className={s.field} controlId='crear-promocion-fecha-fin'>
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

                    <Form.Group className={s.field} controlId='crear-promocion-activo'>
                        <div className={s.switchWrap}>
                            <Form.Check
                                type='switch'
                                id='crear-promocion-activo-switch'
                                checked={activo}
                                onChange={(e) => setActivo(e.target.checked)}
                            />
                            <Form.Label className={`text-label-md ${s.label} mb-0`}>Activa</Form.Label>
                        </div>
                    </Form.Group>

                    <div className={s.actions}>
                        <Button className={s.button} variant='primary' type='submit' disabled={enviando}>
                            {enviando
                                ? <><Spinner size='sm' animation='border' className='me-2' />Creando...</>
                                : 'Crear promoción'}
                        </Button>
                        <Button
                            className={s.button}
                            variant='outline-secondary'
                            type='button'
                            disabled={enviando}
                            onClick={() => navigate('/gerente/carta/promociones')}
                        >
                            Cancelar
                        </Button>
                    </div>
                </Form>
            </Card>
        </div>
    )
}
