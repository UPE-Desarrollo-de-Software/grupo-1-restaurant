import { useEffect, useState } from 'react'
import { Alert, Button, Card, Form, Spinner } from 'react-bootstrap'
import s from './ABMProductos.module.css'
import { API_BASE_URL } from '../../config/env'
import { getToken } from '../../api/auth'

interface Categoria {
    id: number
    nombre: string
}

interface Ingrediente {
    id: number
    nombre: string
}

export function ABMProductosPage() {
    const [categoriaId, setCategoriaId] = useState('')
    const [nombre, setNombre] = useState('')
    const [descripcion, setDescripcion] = useState('')
    const [precio, setPrecio] = useState('')
    const [imagen, setImagen] = useState('')
    const [disponible, setDisponible] = useState(true)
    const [ingredientes, setIngredientes] = useState<number[]>([])

    const [categorias, setCategorias] = useState<Categoria[]>([])
    const [listaIngredientes, setListaIngredientes] = useState<Ingrediente[]>([])

    const [enviando, setEnviando] = useState(false)
    const [errorApi, setErrorApi] = useState<string | null>(null)
    const [exito, setExito] = useState<string | null>(null)
    const [tocado, setTocado] = useState(false)

    const errores: Record<string, string> = {}
    if (tocado) {
        if (!categoriaId) errores.categoria_id = 'Seleccioná una categoría'
        if (!nombre.trim()) errores.nombre = 'Ingresá el nombre'
        if (precio === '' || Number(precio) < 0) errores.precio = 'Ingresá un precio válido'
    }

    useEffect(() => {
        const controller = new AbortController()

        async function cargarOpciones() {
            try {
                const [resCategorias, resIngredientes] = await Promise.all([
                    fetch(`${API_BASE_URL}/categorias`, { signal: controller.signal }),
                    fetch(`${API_BASE_URL}/ingredientes`, { signal: controller.signal }),
                ])

                const dataCategorias = await resCategorias.json().catch(() => null)
                const dataIngredientes = await resIngredientes.json().catch(() => null)

                if (!resCategorias.ok || !resIngredientes.ok) {
                    throw new Error('Error al cargar las categorías o ingredientes')
                }

                if (Array.isArray(dataCategorias)) setCategorias(dataCategorias)
                if (Array.isArray(dataIngredientes)) setListaIngredientes(dataIngredientes)
            } catch (err) {
                if (err instanceof DOMException && err.name === 'AbortError') return
                setErrorApi(err instanceof Error ? err.message : 'Error desconocido al cargar las opciones')
            }
        }

        cargarOpciones()
        return () => controller.abort()
    }, [])

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

        if (!categoriaId || !nombre.trim() || precio === '' || Number(precio) < 0) return

        setEnviando(true)
        try {
            const response = await fetch(`${API_BASE_URL}/productos`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${getToken()}`,
                },
                body: JSON.stringify({
                    categoria_id: Number(categoriaId),
                    nombre: nombre.trim(),
                    descripcion: descripcion.trim() === '' ? null : descripcion.trim(),
                    precio: Number(precio),
                    imagen: imagen.trim() === '' ? null : imagen.trim(),
                    disponible,
                    ingredientes,
                }),
            })

            const data = await response.json().catch(() => null)
            if (!response.ok) {
                throw new Error(data?.message ?? `Error ${response.status} al crear el producto`)
            }

            setExito(data?.message ?? 'Producto creado exitosamente')
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
                                isInvalid={!!errores.nombre}
                            />
                            <Form.Control.Feedback type='invalid'>{errores.nombre}</Form.Control.Feedback>
                        </Form.Group>

                        <Form.Group className={s.field} controlId='abm-producto-categoria'>
                            <Form.Label className={`text-label-md ${s.label}`}>Categoría</Form.Label>
                            <Form.Select
                                className={s.input}
                                value={categoriaId}
                                onChange={(e) => setCategoriaId(e.target.value)}
                                isInvalid={!!errores.categoria_id}
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
                        />
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
                                isInvalid={!!errores.precio}
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
                            />
                        </Form.Group>
                    </div>

                    <Form.Group className={s.field}>
                        <Form.Label className={`text-label-md ${s.label}`}>Ingredientes</Form.Label>
                        <div className={s.ingredientsBox}>
                            {listaIngredientes.length === 0 ? (
                                <p className={`text-body-sm ${s.empty}`}>No hay ingredientes cargados</p>
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
                                    />
                                ))
                            )}
                        </div>
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
