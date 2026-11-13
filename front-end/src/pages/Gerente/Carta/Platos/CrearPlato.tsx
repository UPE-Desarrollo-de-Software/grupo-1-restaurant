import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, Button, Card, Form, Spinner } from 'react-bootstrap'
import s from './Platos.module.css'
import { useCategorias } from '../../../../hooks/useCategorias'
import { useIngredientes } from '../../../../hooks/useIngredientes'
import { usePromociones } from '../../../../hooks/usePromociones'
import { useVistaPreviaImagen } from '../../../../hooks/useVistaPreviaImagen'
import { etiquetaPromocion } from '../../../../components/Platos/promocionEtiqueta'
import { ExitoModal } from '../../../../components/Modales/ExitoModal'
import { formatearPrecio } from '../../../../utils/historial'
import { platoSchema } from '../../../../schemas/carta'
import { createPlato, subirImagenPlato } from '../../../../api/platos'
import { validarImagenPlato } from '../../../../utils/imagenPlato'
import {
    ETIQUETAS_ESTADO_INGREDIENTE,
    flagsDesdeEstado,
    type EstadoIngredientePlato,
} from '../../../../utils/ingredientePlato'

export function CrearPlatoPage() {
    const navigate = useNavigate()
    const [categoria_id, setCategoriaId] = useState('')
    const [promocion_id, setPromocionId] = useState('')
    const [nombre, setNombre] = useState('')
    const [descripcion, setDescripcion] = useState('')
    const [precio, setPrecio] = useState('')
    // La imagen se sube como archivo después del alta (POST /platos/{id}/imagen).
    const [archivo, setArchivo] = useState<File | null>(null)
    const [errorImagen, setErrorImagen] = useState<string | null>(null)
    // Fuerza el remount del <input type=file> (es no controlado) al limpiar
    // el formulario o descartar un archivo inválido.
    const [recargaInput, setRecargaInput] = useState(0)
    const [disponible, setDisponible] = useState(true)
    // Estado por ingrediente id; los no presentes quedan fuera del plato.
    const [ingredientes, setIngredientes] = useState<Record<number, EstadoIngredientePlato>>({})

    const vistaPrevia = useVistaPreviaImagen(archivo)

    const {categorias, loadingCategorias, errorCategorias} = useCategorias()
    const {listaIngredientes, loadingIngredientes, errorIngredientes} = useIngredientes()
    const {promociones, loadingPromociones, errorPromociones} = usePromociones()

    const [enviando, setEnviando] = useState(false)
    const [errorApi, setErrorApi] = useState<string | null>(null)
    // Plato creado: abre el modal de confirmación (Listo / Seguir creando).
    const [platoCreado, setPlatoCreado] = useState<{ nombre: string; precio: number } | null>(null)
    const [tocado, setTocado] = useState(false)

    const errores: Record<string, string> = {}
    // El backend acepta objetos con los flags del pivot (opcional/por_defecto).
    const ingredientesConFlags = Object.entries(ingredientes).map(([id, estado]) => ({
        ingrediente_id: Number(id),
        ...flagsDesdeEstado(estado),
    }))
    const resultados = platoSchema.safeParse({
        categoria_id,
        promocion_id: promocion_id === '' ? null : promocion_id,
        nombre,
        descripcion,
        precio,
        disponible,
        ingredientes: ingredientesConFlags,
    })
    if (!resultados.success) {
        for (const issue of resultados.error.issues) {
        const campo = issue.path[0]
        if (typeof campo === "string" && !errores[campo]) {
            errores[campo] = issue.message
        }
        }
    }

    function cambiarEstadoIngrediente(id: number, estado: EstadoIngredientePlato | '') {
        setIngredientes(prev => {
            const siguiente = { ...prev }
            if (estado === '') delete siguiente[id]
            else siguiente[id] = estado
            return siguiente
        })
    }

    function elegirArchivo(elegido: File | null) {
        if (!elegido) {
            setArchivo(null)
            setErrorImagen(null)
            return
        }
        const problema = validarImagenPlato(elegido)
        setErrorImagen(problema)
        setArchivo(problema ? null : elegido)
        // Un archivo inválido no queda seleccionado en el input.
        if (problema) setRecargaInput(n => n + 1)
    }

    async function handlerSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setTocado(true)
        setPlatoCreado(null)
        setErrorApi(null)

        if (!resultados.success) return

        const problemaImagen = archivo ? validarImagenPlato(archivo) : null
        if (problemaImagen) {
            setErrorImagen(problemaImagen)
            return
        }

        setEnviando(true)
        try {
            const rta = await createPlato(resultados.data)
            // La imagen va por su propio endpoint: el alta ya no acepta
            // `imagen` en el body. Si falla, el plato YA existe: se avisa
            // sin volver a crearlo (la imagen se puede subir desde Editar).
            if (archivo) {
                try {
                    await subirImagenPlato(rta.plato.id, archivo)
                } catch (err) {
                    setErrorApi(`El plato se creó, pero la imagen no se pudo subir: ${err instanceof Error ? err.message : 'error desconocido'}`)
                }
            }
            setPlatoCreado({
                nombre: resultados.data.nombre,
                precio: resultados.data.precio,
            })
            setCategoriaId('')
            setPromocionId('')
            setNombre('')
            setDescripcion('')
            setPrecio('')
            setArchivo(null)
            setErrorImagen(null)
            setRecargaInput(n => n + 1)
            setDisponible(true)
            setIngredientes({})
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
                            <Form.Label className={`text-label-md ${s.label}`}>Imagen</Form.Label>
                            <Form.Control
                                key={recargaInput}
                                className={`${s.input}`}
                                type='file'
                                accept='image/jpeg,image/png,image/webp'
                                onChange={(e) => elegirArchivo((e.target as HTMLInputElement).files?.[0] ?? null)}
                                isInvalid={!!errorImagen}
                                disabled={enviando}
                            />
                            <Form.Control.Feedback type='invalid'>{errorImagen}</Form.Control.Feedback>
                            <p className={`text-body-sm ${s.ayuda}`}>
                                JPG, PNG o WEBP de hasta 2 MB. La imagen se sube al crear el plato.
                            </p>
                            {vistaPrevia && (
                                <img className={s.vistaPrevia} src={vistaPrevia} alt='Vista previa de la imagen' />
                            )}
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
                                : 'La promoción se aplica al realizar el pedido.'}
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
                                    <div key={ing.id} className={`text-body-sm ${s.ingredientItem}`}>
                                        <span>{ing.nombre}</span>
                                        <Form.Select
                                            className={s.input}
                                            aria-label={`Estado de ${ing.nombre}`}
                                            value={ingredientes[ing.id] ?? ''}
                                            onChange={(e) =>
                                                cambiarEstadoIngrediente(ing.id, e.target.value as EstadoIngredientePlato | '')
                                            }
                                        >
                                            <option value=''>No incluir</option>
                                            {(Object.keys(ETIQUETAS_ESTADO_INGREDIENTE) as EstadoIngredientePlato[]).map(estado => (
                                                <option key={estado} value={estado}>
                                                    {ETIQUETAS_ESTADO_INGREDIENTE[estado]}
                                                </option>
                                            ))}
                                        </Form.Select>
                                    </div>
                                ))
                            )}
                        </div>
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

            <ExitoModal
                show={platoCreado !== null}
                titulo='Plato creado'
                mensaje='¡Listo! El plato se creó correctamente.'
                datos={platoCreado
                    ? [
                        { etiqueta: 'Nombre', valor: platoCreado.nombre },
                        { etiqueta: 'Precio', valor: formatearPrecio(platoCreado.precio) },
                    ]
                    : []}
                onSeguir={() => setPlatoCreado(null)}
                onListo={() => navigate('/gerente/carta/platos')}
            />
        </div>
    )
}
