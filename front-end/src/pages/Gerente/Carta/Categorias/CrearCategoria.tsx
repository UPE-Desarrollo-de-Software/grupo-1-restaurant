import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, Button, Card, Form, Spinner } from 'react-bootstrap'
import s from './Platos.module.css'
import { categoriaSchema } from '../../../../schemas/carta'
import { createCategoria } from '../../../../api/categorias'
import { ExitoModal } from '../../../../components/Exito/ExitoModal'

export function CrearCategoriaPage() {
    const navigate = useNavigate()

    const [nombre, setNombre] = useState('')
    const [descripcion, setDescripcion] = useState('')
    const [activo, setActivo] = useState(true)

    const [enviando, setEnviando] = useState(false)
    const [errorApi, setErrorApi] = useState<string | null>(null)
    // Categoría creada: abre el modal de confirmación (Listo / Seguir creando).
    const [categoriaCreada, setCategoriaCreada] = useState<{ nombre: string; activa: boolean } | null>(null)
    const [tocado, setTocado] = useState(false)

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
        setCategoriaCreada(null)
        setErrorApi(null)

        if (!resultados.success) return

        setEnviando(true)
        try {
            await createCategoria(resultados.data)
            setCategoriaCreada({
                nombre: resultados.data.nombre,
                activa: resultados.data.activo,
            })
            setNombre('')
            setDescripcion('')
            setActivo(true)
            setTocado(false)
        } catch (err) {
            setErrorApi(err instanceof Error ? err.message : 'Error desconocido al crear la categoría')
        } finally {
            setEnviando(false)
        }
    }

    return (
        <div className={s.page}>
            <Card className={s.card}>
                <h1 className={`text-headline-md ${s.title}`}>Nueva categoría</h1>
                <p className={`text-body-sm ${s.subtitle}`}>
                    La categoría creada se refleja en su propia lista.
                </p>

                {errorApi && <Alert variant='danger' className='text-body-md'>{errorApi}</Alert>}

                <Form onSubmit={handlerSubmit} noValidate>
                    <div className={s.row}>
                        <Form.Group className={s.field} controlId='crear-categoria-nombre'>
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
                        <Form.Group className={s.field} controlId='crear-categoria-descripcion'>
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

                    <Form.Group className={s.field} controlId='crear-categoria-activo'>
                        <div className={s.switchWrap}>
                            <Form.Check
                                type='switch'
                                id='crear-categoria-activo-switch'
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
                                : 'Crear categoría'}
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

            <ExitoModal
                show={categoriaCreada !== null}
                titulo='Categoría creada'
                mensaje='¡Listo! La categoría se creó correctamente.'
                datos={categoriaCreada
                    ? [
                        { etiqueta: 'Nombre', valor: categoriaCreada.nombre },
                        { etiqueta: 'Activa', valor: categoriaCreada.activa ? 'Sí' : 'No' },
                    ]
                    : []}
                onSeguir={() => setCategoriaCreada(null)}
                onListo={() => navigate('/gerente/carta/categorias')}
            />
        </div>
    )
}
