import { useState } from 'react'
import { Alert, Button, Card, Form, Spinner } from 'react-bootstrap'
import s from './ABMProductos.module.css'
import { useCategorias } from '../../hooks/useCategorias'
import { useIngredientes } from '../../hooks/useIngredientes'
import { productoSchema } from '../../schemas/menu'
import { createProductos } from '../../api/productos'

export function ABMProductosPage() {
    const [categoria_id, setCategoriaId] = useState('')
    const [nombre, setNombre] = useState('')
    const [descripcion, setDescripcion] = useState('')
    const [precio, setPrecio] = useState('')
    const [imagen, setImagen] = useState('')
    const [disponible, setDisponible] = useState(true)
    const [ingredientes, setIngredientes] = useState<number[]>([])

    const {categorias, loadingCategorias, errorCategorias} = useCategorias()
    const {listaIngredientes, loadingIngredientes, errorIngredientes} = useIngredientes()

    const [enviando, setEnviando] = useState(false)
    const [errorApi, setErrorApi] = useState<string | null>(null)
    const [exito, setExito] = useState<string | null>(null)
    const [tocado, setTocado] = useState(false)

    const errores: Record<string, string> = {}
    const resultados = productoSchema.safeParse({categoria_id,nombre,descripcion,precio,imagen,disponible,ingredientes})
    if (!resultados.success) {
        for (const issue of resultados.error.issues) {
        const campo = issue.path[0]
        if (typeof campo === "string" && !errores[campo]) {
            errores[campo] = issue.message
        }
        }
    }

    function toggleIngrediente(id: number) {
        setIngredientes(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        )
    }

    async function handlerSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setTocado(true)
        setExito(null)
        setErrorApi(null)

        if (!resultados.success) return

        setEnviando(true)
        try {
            const producto = await createProductos(resultados.data)
            setExito(producto.message)
            setCategoriaId('')
            setNombre('')
            setDescripcion('')
            setPrecio('')
            setImagen('')
            setDisponible(true)
            setIngredientes([])
            setTocado(false)
        } catch (err) {
            setErrorApi(err instanceof Error ? err.message : 'Error desconocido al crear el producto')
        } finally {
            setEnviando(false)
        }
    }

    return (
        <div className={s.page}>
            <Card className={s.card}>
                <h1 className={`text-headline-md ${s.title}`}>ABM de productos</h1>
                <p className={`text-body-sm ${s.subtitle}`}>Alta de productos de la carta</p>

                {(errorCategorias || errorIngredientes) && 
                    <Alert variant='danger' className='text-body-md'>
                        No se pudieron cargar las categorías o los ingredientes. Verificá que el servidor esté activo
                    </Alert>}
                {errorApi && <Alert variant='danger' className='text-body-md'>{errorApi}</Alert>}
                {exito && <Alert variant='success' className='text-body-md'>{exito}</Alert>}

                <Form onSubmit={handlerSubmit} noValidate>
                    <div className={s.row}>
                        <Form.Group className={s.field} controlId='abm-producto-nombre'>
                            <Form.Label className={`text-label-md ${s.label}`}>Nombre</Form.Label>
                            <Form.Control
                                className={s.input}
                                type='text'
                                placeholder='Milanesa napolitana'
                                value={nombre}
                                onChange={(e) => setNombre(e.target.value)}
                                isInvalid={tocado && !!errores.nombre}
                            />
                            <Form.Control.Feedback type='invalid'>{errores.nombre}</Form.Control.Feedback>
                        </Form.Group>

                        <Form.Group className={s.field} controlId='abm-producto-categoria'>
                            <Form.Label className={`text-label-md ${s.label}`}>Categoría</Form.Label>
                            <Form.Select
                                className={s.input}
                                value={categoria_id}
                                onChange={(e) => setCategoriaId(e.target.value)}
                                isInvalid={tocado && !!errores.categoria_id}
                                disabled={loadingCategorias}
                            >
                                <option value='' disabled={true}>Seleccioná una categoría</option>
                                {categorias.map(c => (
                                    <option value={c.id} key={c.id}>{c.nombre}</option>
                                ))}
                            </Form.Select>
                            <Form.Control.Feedback type='invalid'>{errores.categoria_id}</Form.Control.Feedback>
                        </Form.Group>
                    </div>

                    <Form.Group className={s.field} controlId='abm-producto-descripcion'>
                        <Form.Label className={`text-label-md ${s.label}`}>Descripción</Form.Label>
                        <Form.Control
                            className={s.input}
                            as='textarea'
                            rows={3}
                            placeholder='Descripción del plato (opcional)'
                            value={descripcion}
                            onChange={(e) => setDescripcion(e.target.value)}
                            isInvalid={tocado &&  !!errores.descripcion}
                        />
                        <Form.Control.Feedback type='invalid'>{errores.descripcion}</Form.Control.Feedback>
                    </Form.Group>

                    <div className={s.row}>
                        <Form.Group className={s.field} controlId='abm-producto-precio'>
                            <Form.Label className={`text-label-md ${s.label}`}>Precio</Form.Label>
                            <Form.Control
                                className={s.input}
                                type='number'
                                min={0}
                                step='0.01'
                                placeholder='1500'
                                value={precio}
                                onChange={(e) => setPrecio(e.target.value)}
                                isInvalid={tocado &&  !!errores.precio}
                            />
                            <Form.Control.Feedback type='invalid'>{errores.precio}</Form.Control.Feedback>
                        </Form.Group>

                        <Form.Group className={s.field} controlId='abm-producto-imagen'>
                            <Form.Label className={`text-label-md ${s.label}`}>Imagen (URL)</Form.Label>
                            <Form.Control
                                className={s.input}
                                type='text'
                                placeholder='https://...'
                                value={imagen}
                                onChange={(e) => setImagen(e.target.value)}
                                isInvalid={tocado &&  !!errores.imagen}
                            />
                            <Form.Control.Feedback type='invalid'>{errores.imagen}</Form.Control.Feedback>
                        </Form.Group>
                    </div>

                    <Form.Group className={s.field} controlId='abm-producto-ingredientes'>
                        <Form.Label className={`text-label-md ${s.label}`}>Ingredientes</Form.Label>
                        <div className={s.ingredientsBox}>
                            {loadingIngredientes ? (
                                    <p className={`text-body-sm ${s.empty}`}>Cargando ingredientes...</p>
                                ) :
                            listaIngredientes.length === 0 ? (
                                <p className={`text-body-sm ${s.empty}`}>No tiene ingredientes cargados</p>
                            ) : (
                                listaIngredientes.map(ing => (
                                    <Form.Check
                                        key={ing.id}
                                        className={`text-body-sm ${s.ingredientItem}`}
                                        type='checkbox'
                                        id={`ingrediente-${ing.id}`}
                                        label={ing.nombre}
                                        checked={ingredientes.includes(ing.id)}
                                        onChange={() => toggleIngrediente(ing.id)}
                                        isInvalid={tocado &&  !!errores.ingredientes}
                                    />
                                ))
                            )}
                        </div>
                        <Form.Control.Feedback type='invalid'>{errores.ingredientes}</Form.Control.Feedback>
                    </Form.Group>

                    <Form.Group className={s.field} controlId='abm-producto-disponible'>
                        <div className={s.switchWrap}>
                            <Form.Check
                                type='switch'
                                id='producto-disponible'
                                checked={disponible}
                                onChange={(e) => setDisponible(e.target.checked)}
                            />
                            <Form.Label className={`text-label-md ${s.label} mb-0`}>Disponible</Form.Label>
                        </div>
                    </Form.Group>

                    <Button className={s.button} variant='primary' type='submit' disabled={enviando}>
                        {enviando
                            ? <><Spinner size='sm' animation='border' className='me-2' />Guardando...</>
                            : 'Crear producto'}
                    </Button>
                </Form>
            </Card>
        </div>
    )
}
