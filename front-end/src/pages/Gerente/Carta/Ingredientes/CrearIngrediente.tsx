import { useState } from 'react'
import { Alert, Button, Card, Form, Spinner } from 'react-bootstrap'
import s from './Platos.module.css'
import { ingredienteSchema } from '../../../../schemas/carta'
import { createIngrediente } from '../../../../api/ingredientes'

export function CrearIngredientePage() {
    const [nombre, setNombre] = useState('')
    const [precioAdicional, setPrecio] = useState('')

    const [enviando, setEnviando] = useState(false)
    const [errorApi, setErrorApi] = useState<string | null>(null)
    const [exito, setExito] = useState<string | null>(null)
    const [tocado, setTocado] = useState(false)

    const errores: Record<string, string> = {}
    const resultados = ingredienteSchema.safeParse({nombre,precioAdicional})
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
            const ingrediente = await createIngrediente(resultados.data)
            setExito(ingrediente.message)
            setNombre('')
            setPrecio('')
            setTocado(false)
        } catch (err) {
            setErrorApi(err instanceof Error ? err.message : 'Error desconocido al crear el ingrediente')
        } finally {
            setEnviando(false)
        }
    }

    return (
        <div className={s.page}>
            <Card className={s.card}>
                <h1 className={`text-headline-md ${s.title}`}>Nuevo ingrediente</h1>
                <p className={`text-body-sm ${s.subtitle}`}>El ingrediente creado se refleja en su propia lista.</p>
                
                {errorApi && <Alert variant='danger' className='text-body-md'>{errorApi}</Alert>}
                {exito && <Alert variant='success' className='text-body-md'>{exito}</Alert>}

                <Form onSubmit={handlerSubmit} noValidate>
                    <div className={s.row}>
                        <Form.Group className={s.field} controlId='abm-ingrediente-nombre'>
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
                        <Form.Group className={s.field} controlId='abm-ingrediente-precio'>
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

                    <Button className={s.button} variant='primary' type='submit' disabled={enviando}>
                        {enviando
                            ? <><Spinner size='sm' animation='border' className='me-2' />Guardando...</>
                            : 'Crear ingrediente'}
                    </Button>
                </Form>
            </Card>
        </div>
    )
}
