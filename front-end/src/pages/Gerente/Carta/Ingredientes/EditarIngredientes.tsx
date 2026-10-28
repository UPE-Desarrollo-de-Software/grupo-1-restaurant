import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Alert, Button, Card, Form, Spinner } from 'react-bootstrap'
import s from './Platos.module.css'
import { ingredienteSchema } from '../../../../schemas/carta'
import { deleteIngrediente, getIngrediente, updateIngrediente } from '../../../../api/ingredientes'
import { ZonaPeligro } from '../../../../components/ZonaPeligro/ZonaPeligro'

export function EditarIngredientePage() {
    const { id } = useParams()
    const [nombre, setNombre] = useState('')
    const [precioAdicional, setPrecio] = useState('')

    const [cargando, setCargando] = useState(true)
    const [enviando, setEnviando] = useState(false)
    const [errorApi, setErrorApi] = useState<string | null>(null)
    const [exito, setExito] = useState<string | null>(null)
    const [tocado, setTocado] = useState(false)
    
    const [eliminando, setEliminando] = useState(false)
    const navigate = useNavigate()

    useEffect(() => {
        const controller = new AbortController()
        getIngrediente(Number(id), controller.signal)
            .then(ingrediente => {
                setNombre(ingrediente.nombre)
                setPrecio(String(ingrediente.precioAdicional))
            })
            .catch(err => {
                if (!controller.signal.aborted) {
                    setErrorApi(err instanceof Error ? err.message : 'Error desconocido al cargar el ingrediente')
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) setCargando(false)
            })
        return () => controller.abort()
    }, [id])

    const errores: Record<string, string> = {}
    const resultados = ingredienteSchema.safeParse({nombre, precioAdicional})
    if (!resultados.success) {
        for (const issue of resultados.error.issues) {
        const campo = issue.path[0]
        if (typeof campo === "string" && !errores[campo]) {
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
            const rta = await updateIngrediente(Number(id), resultados.data)
            setExito(rta.message)
            setTocado(false)
        } catch (err) {
            setErrorApi(err instanceof Error ? err.message : 'Error desconocido al actualizar el ingrediente')
        } finally {
            setEnviando(false)
        }
    }

    async function handlerEliminar() {
        setEliminando(true)
        setErrorApi(null)
        try {
            const rta = await deleteIngrediente(Number(id))
            setExito(rta.message)
            setEliminando(false)
        } catch (err) {
            setErrorApi(err instanceof Error ? err.message : 'Error desconocido al eliminar el ingrediente')
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
                <h1 className={`text-headline-md ${s.title}`}>Editar ingrediente</h1>
                <p className={`text-body-sm ${s.subtitle}`}>Modificá el nombre o el precio adicional del ingrediente.</p>

                {exito && (
                    <Alert variant='success' className='text-body-md d-flex flex-wrap align-items-center justify-content-between gap-2'>
                        <span>{exito}</span>
                        <Button
                            className='text-label-md'
                            variant='outline-success'
                            size='sm'
                            type='button'
                            onClick={() => navigate('/gerente/carta/ingredientes')}
                        >
                            Volver a la lista
                        </Button>
                    </Alert>
                )}

                {errorApi && <Alert variant='danger' className='text-body-md'>{errorApi}</Alert>}

                <Form onSubmit={handlerSubmit} noValidate>
                    <div className={s.row}>
                        <Form.Group className={s.field} controlId='editar-ingrediente-nombre'>
                            <Form.Label className={`text-label-md ${s.label}`}>Nombre</Form.Label>
                            <Form.Control
                                className={s.input}
                                type='text'
                                placeholder='Huevo Frito'
                                value={nombre}
                                onChange={(e) => setNombre(e.target.value)}
                                isInvalid={tocado && !!errores.nombre}
                            />
                            <Form.Control.Feedback type='invalid'>{errores.nombre}</Form.Control.Feedback>
                        </Form.Group>
                    </div>

                    <div className={s.row}>
                        <Form.Group className={s.field} controlId='editar-ingrediente-precio'>
                            <Form.Label className={`text-label-md ${s.label}`}>Precio (opcional)</Form.Label>

                            <Form.Control
                                className={s.input}
                                type='number'
                                min={0}
                                step='0.01'
                                placeholder='700'
                                value={precioAdicional}
                                onChange={(e) => setPrecio(e.target.value)}
                                isInvalid={tocado &&  !!errores.precioAdicional}
                            />
                            <Form.Control.Feedback type='invalid'>{errores.precioAdicional}</Form.Control.Feedback>
                        </Form.Group>
                    </div>
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
                            onClick={()=>{ navigate('/gerente/carta/ingredientes')}}>
                                Cancelar
                        </Button>
                    </div>

                </Form>
            </Card>
            <div className={s.zonaWrap}>
                <ZonaPeligro
                descripcion='Eliminar este ingrediente lo quitará de todos sus platos. Esta acción no se puede deshacer.'
                textoBoton='Eliminar plato'
                eliminando={eliminando}
                onEliminar={handlerEliminar}
                />
            </div>

        </div>
    )
}
