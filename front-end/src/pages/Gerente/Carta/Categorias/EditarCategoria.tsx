import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Alert, Button, Card, Form, Spinner } from 'react-bootstrap'
import s from './Platos.module.css'
import { categoriaSchema } from '../../../../schemas/carta'
import { deleteCategoria, getCategoria, updateCategoria } from '../../../../api/categorias'
import { ZonaPeligro } from '../../../../components/ZonaPeligro/ZonaPeligro'

export function EditarCategoriaPage() {
    const { id } = useParams()
    const navigate = useNavigate()

    const [nombre, setNombre] = useState('')
    const [descripcion, setDescripcion] = useState('')
    const [activo, setActivo] = useState(true)

    const [cargando, setCargando] = useState(true)
    const [enviando, setEnviando] = useState(false)
    const [eliminando, setEliminando] = useState(false)
    const [errorApi, setErrorApi] = useState<string | null>(null)
    const [exito, setExito] = useState<string | null>(null)
    const [tocado, setTocado] = useState(false)

    useEffect(() => {
        const controller = new AbortController()
        getCategoria(Number(id), controller.signal)
            .then(categoria => {
                setNombre(categoria.nombre)
                setDescripcion(categoria.descripcion)
                setActivo(categoria.activo)
            })
            .catch(err => {
                if (!controller.signal.aborted) {
                    setErrorApi(err instanceof Error ? err.message : 'Error desconocido al cargar la categoría')
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) setCargando(false)
            })
        return () => controller.abort()
    }, [id])

    const errores: Record<string, string> = {}
    const resultados = categoriaSchema.safeParse({ nombre, descripcion, activo })
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
            const rta = await updateCategoria(Number(id), resultados.data)
            setExito(rta.message)
            setTocado(false)
        } catch (err) {
            setErrorApi(err instanceof Error ? err.message : 'Error desconocido al actualizar la categoría')
        } finally {
            setEnviando(false)
        }
    }

    async function handlerEliminar() {
        setErrorApi(null)
        setEliminando(true)
        try {
            await deleteCategoria(Number(id))
            navigate('/gerente/carta/categorias')
        } catch (err) {
            setErrorApi(err instanceof Error ? err.message : 'Error desconocido al eliminar la categoría')
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
                <h1 className={`text-headline-md ${s.title}`}>Editar categoría</h1>
                <p className={`text-body-sm ${s.subtitle}`}>
                    Modificá el nombre, la descripción o el estado de la categoría.
                </p>

                {errorApi && <Alert variant='danger' className='text-body-md'>{errorApi}</Alert>}
                {exito && (
                    <Alert variant='success' className='text-body-md d-flex flex-wrap align-items-center justify-content-between gap-2'>
                        <span>{exito}</span>
                        <Button
                            className='text-label-md'
                            variant='outline-success'
                            size='sm'
                            type='button'
                            onClick={() => navigate('/gerente/carta/categorias')}
                        >
                            Volver a la lista
                        </Button>
                    </Alert>
                )}

                <Form onSubmit={handlerSubmit} noValidate>
                    <div className={s.row}>
                        <Form.Group className={s.field} controlId='editar-categoria-nombre'>
                            <Form.Label className={`text-label-md ${s.label}`}>Nombre</Form.Label>
                            <Form.Control
                                className={s.input}
                                type='text'
                                placeholder='Postres'
                                value={nombre}
                                onChange={(e) => setNombre(e.target.value)}
                                isInvalid={tocado && !!errores.nombre}
                            />
                            <Form.Control.Feedback type='invalid'>{errores.nombre}</Form.Control.Feedback>
                        </Form.Group>
                    </div>

                    <div className={s.row}>
                        <Form.Group className={s.field} controlId='editar-categoria-descripcion'>
                            <Form.Label className={`text-label-md ${s.label}`}>Descripción</Form.Label>
                            <Form.Control
                                className={s.input}
                                as='textarea'
                                rows={3}
                                placeholder='Descripción de la categoría'
                                value={descripcion}
                                onChange={(e) => setDescripcion(e.target.value)}
                                isInvalid={tocado && !!errores.descripcion}
                            />
                            <Form.Control.Feedback type='invalid'>{errores.descripcion}</Form.Control.Feedback>
                        </Form.Group>
                    </div>

                    <Form.Group className={s.field} controlId='editar-categoria-activo'>
                        <div className={s.switchWrap}>
                            <Form.Check
                                type='switch'
                                id='editar-categoria-activo-switch'
                                checked={activo}
                                onChange={(e) => setActivo(e.target.checked)}
                            />
                            <Form.Label className={`text-label-md ${s.label} mb-0`}>Activa</Form.Label>
                        </div>
                    </Form.Group>

                    <div className={s.actions}>
                        <Button className={s.button} variant='primary' type='submit' disabled={enviando}>
                            {enviando
                                ? <><Spinner size='sm' animation='border' className='me-2' />Guardando...</>
                                : 'Guardar cambios'}
                        </Button>

                        <Button
                            className={s.button}
                            variant='outline-secondary'
                            type='button'
                            disabled={enviando}
                            onClick={() => navigate('/gerente/carta/categorias')}
                        >
                            Cancelar
                        </Button>
                    </div>
                </Form>
            </Card>

            <div className={s.zonaWrap}>
                <ZonaPeligro
                    descripcion='Eliminar esta categoría la quitará de la carta. Los platos que la usen pueden impedir la eliminación. Esta acción no se puede deshacer.'
                    textoBoton='Eliminar categoría'
                    eliminando={eliminando}
                    onEliminar={handlerEliminar}
                />
            </div>
        </div>
    )
}
