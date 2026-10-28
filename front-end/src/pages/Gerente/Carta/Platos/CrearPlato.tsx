import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, Button, Card, Form, Spinner } from 'react-bootstrap'
import s from './Platos.module.css'
import { useCategorias } from '../../../../hooks/useCategorias'
import { useIngredientes } from '../../../../hooks/useIngredientes'
import { usePromociones } from '../../../../hooks/usePromociones'
import { etiquetaPromocion } from '../../../../components/Platos/promocionEtiqueta'
import { platoSchema } from '../../../../schemas/carta'
import { createPlato } from '../../../../api/platos'

export function CrearPlatoPage() {
    const navigate = useNavigate()
    const [categoria_id, setCategoriaId] = useState('')
    const [promocion_id, setPromocionId] = useState('')
    const [nombre, setNombre] = useState('')
    const [descripcion, setDescripcion] = useState('')
    const [precio, setPrecio] = useState('')
    const [imagen, setImagen] = useState('')
    const [disponible, setDisponible] = useState(true)
    const [ingredientes, setIngredientes] = useState<number[]>([])

    const {categorias, loadingCategorias, errorCategorias} = useCategorias()
    const {listaIngredientes, loadingIngredientes, errorIngredientes} = useIngredientes()
    const {promociones, loadingPromociones, errorPromociones} = usePromociones()

    const [enviando, setEnviando] = useState(false)
    const [errorApi, setErrorApi] = useState<string | null>(null)
    const [exito, setExito] = useState<string | null>(null)
    const [tocado, setTocado] = useState(false)

    const errores: Record<string, string> = {}
    const resultados = platoSchema.safeParse({
        categoria_id,
        promocion_id: promocion_id === '' ? null : promocion_id,
        nombre,
        descripcion,
        precio,
        imagen,
        disponible,
        ingredientes,
    })
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
            const plato = await createPlato(resultados.data)
            setExito(plato.message)
            setCategoriaId('')
            setPromocionId('')
            setNombre('')
            setDescripcion('')
            setPrecio('')
            setImagen('')
            setDisponible(true)
            setIngredientes([])
            setTocado(false)
        } catch (err) {
            setErrorApi(err instanceof Error ? err.message : 'Error desconocido al crear el plato')
        } finally {
            setEnviando(false)
        }
    }

    return (
        <div className={s.page}>
            <Card className={s.card}>
                <h1 className={`text-headline-md ${s.title}`}>Nuevo plato</h1>
                <p className={`text-body-sm ${s.subtitle}`}>El plato creado se refleja en la carta.</p>

                {(errorCategorias || errorIngredientes || errorPromociones) && 
                    <Alert variant='danger' className='text-body-md'>
                        No se pudieron cargar las categorías, los ingredientes o las promociones. Verificá que el servidor esté activo
                    </Alert>}
                {errorApi && <Alert variant='danger' className='text-body-md'>{errorApi}</Alert>}
                {exito && <Alert variant='success' className='text-body-md'>{exito}</Alert>}

                <Form onSubmit={handlerSubmit} noValidate>
                    <div className={s.row}>
                        <Form.Group className={s.field} controlId='abm-plato-nombre'>
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

                        <Form.Group className={s.field} controlId='abm-plato-categoria'>
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

                    <Form.Group className={s.field} controlId='abm-plato-descripcion'>
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
                        <Form.Group className={s.field} controlId='abm-plato-precio'>
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

                        <Form.Group className={s.field} controlId='abm-plato-imagen'>
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

                    <Form.Group className={s.field} controlId='abm-plato-promocion'>
                        <Form.Label className={`text-label-md ${s.label}`}>Promoción</Form.Label>
                        <Form.Select
                            className={s.input}
                            value={promocion_id}
                            onChange={(e) => setPromocionId(e.target.value)}
                            disabled={loadingPromociones}
                        >
                            <option value=''>Sin promoción</option>
                            {promociones.filter(p => p.activo).map(p => (
                                <option value={p.id} key={p.id}>
                                    {p.nombre} ({etiquetaPromocion(p)})
                                </option>
                            ))}
                        </Form.Select>
                        <p className={`text-body-sm ${s.ayuda}`}>
                            {loadingPromociones
                                ? 'Cargando promociones...'
                                : 'La promoción seleccionada se muestra en la tarjeta del plato y el descuento se aplica al precio al realizar el pedido.'}
                        </p>
                    </Form.Group>

                    <Form.Group className={s.field} controlId='abm-plato-ingredientes'>
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

                    <Form.Group className={s.field} controlId='abm-plato-disponible'>
                        <div className={s.switchWrap}>
                            <Form.Check
                                type='switch'
                                id='plato-disponible'
                                checked={disponible}
                                onChange={(e) => setDisponible(e.target.checked)}
                            />
                            <Form.Label className={`text-label-md ${s.label} mb-0`}>Disponible</Form.Label>
                        </div>
                    </Form.Group>

                    <div className={s.actions}>
                        <Button className={s.button} variant='primary' type='submit' disabled={enviando}>
                            {enviando
                                ? <><Spinner size='sm' animation='border' className='me-2' />Guardando...</>
                                : 'Crear plato'}
                        </Button>
                        <Button
                            className={s.button}
                            variant='outline-secondary'
                            type='button'
                            disabled={enviando}
                            onClick={() => navigate('/gerente/carta/platos')}
                        >
                            Cancelar
                        </Button>
                    </div>
                </Form>
            </Card>
        </div>
    )
}
