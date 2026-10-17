import { useState } from 'react'
import { Alert, Button, Card, Form, Spinner } from 'react-bootstrap'
import s from './Platos.module.css'
import { categoriaSchema } from '../../../../schemas/menu'
import { createCategoria } from '../../../../api/categorias'

export function CrearCategoriaPage() {
    const [nombre, setNombre] = useState('')
    const [descripcion, setDescripcion] = useState('')
    const [disponible, setDisponible] = useState(true)

    const [enviando, setEnviando] = useState(false)
    const [errorApi, setErrorApi] = useState<string | null>(null)
    const [exito, setExito] = useState<string | null>(null)
    const [tocado, setTocado] = useState(false)

    const errores: Record<string, string> = {}
    const resultados = categoriaSchema.safeParse({nombre,descripcion,disponible})
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
            const categoria = await createCategoria(resultados.data)
            setExito(categoria.message)
            setNombre('')
            setDescripcion('')
            setDisponible(true)
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
                <p className={`text-body-sm ${s.subtitle}`}>La categoría creada se refleja en su propia lista.</p>
                
                {errorApi && <Alert variant='danger' className='text-body-md'>{errorApi}</Alert>}
                {exito && <Alert variant='success' className='text-body-md'>{exito}</Alert>}

                <Form onSubmit={handlerSubmit} noValidate>
                    <div className={s.row}>
                        <Form.Group className={s.field} controlId='abm-categoria-nombre'>
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
                        <Form.Group className={s.field} controlId='abm-categoria-descripcion'>
                            <Form.Label className={`text-label-md ${s.label}`}>Descripción</Form.Label>
                            <Form.Control
                                className={s.input}
                                as='textarea'
                                rows={3}
                                placeholder='Descripción de la categoría'
                                value={descripcion}
                                onChange={(e) => setDescripcion(e.target.value)}
                                isInvalid={tocado &&  !!errores.descripcion}
                            />
                            <Form.Control.Feedback type='invalid'>{errores.descripcion}</Form.Control.Feedback>
                        </Form.Group>
                    </div>

                    <Form.Group className={s.field} controlId='abm-categoria-disponible'>
                        <div className={s.switchWrap}>
                            <Form.Check
                                type='switch'
                                id='categoria-disponible'
                                checked={disponible}
                                onChange={(e) => setDisponible(e.target.checked)}
                            />
                            <Form.Label className={`text-label-md ${s.label} mb-0`}>Disponible</Form.Label>
                        </div>
                    </Form.Group>  
             

                    <Button className={s.button} variant='primary' type='submit' disabled={enviando}>
                        {enviando
                            ? <><Spinner size='sm' animation='border' className='me-2' />Guardando...</>
                            : 'Crear categoría'}
                    </Button>
                </Form>
            </Card>
        </div>
    )
}
