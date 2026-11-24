import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, Button, Card, Form, Spinner } from 'react-bootstrap'
import s from './Platos.module.css'
import { ingredienteSchema } from '../../../../schemas/carta'
import { createIngrediente } from '../../../../api/ingredientes'
import { ExitoModal } from '../../../../components/Modales/ExitoModal'
import { formatearPrecio } from '../../../../utils/historial'

export function CrearIngredientePage() {
    const navigate = useNavigate()
    const [nombre, setNombre] = useState('')
    const [precioAdicional, setPrecio] = useState('')

    const [enviando, setEnviando] = useState(false)
    const [errorApi, setErrorApi] = useState<string | null>(null)
    // Ingrediente creado: abre el modal de confirmación (Listo / Seguir creando).
    const [ingredienteCreado, setIngredienteCreado] = useState<{ nombre: string; precio: number | null } | null>(null)
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
        setIngredienteCreado(null)
        setErrorApi(null)

        if (!resultados.success) return

        setEnviando(true)
        try {
            await createIngrediente(resultados.data)
            setIngredienteCreado({
                nombre: resultados.data.nombre,
                precio: resultados.data.precioAdicional ?? null,
            })
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

            <ExitoModal
                show={ingredienteCreado !== null}
                titulo='Ingrediente creado'
                mensaje='¡Listo! El ingrediente se creó correctamente.'
                datos={ingredienteCreado
                    ? [
                        { etiqueta: 'Nombre', valor: ingredienteCreado.nombre },
                        {
                            etiqueta: 'Precio',
                            valor: ingredienteCreado.precio === null
                                ? 'Sin precio adicional'
                                : formatearPrecio(ingredienteCreado.precio),
                        },
                    ]
                    : []}
                onSeguir={() => setIngredienteCreado(null)}
                onListo={() => navigate('/gerente/carta/ingredientes')}
            />
        </div>
    )
}
