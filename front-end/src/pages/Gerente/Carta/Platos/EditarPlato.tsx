import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Alert, Button, Card, Form, Spinner } from 'react-bootstrap'
import s from './Platos.module.css'
import { useCategorias } from '../../../../hooks/useCategorias'
import { useIngredientes } from '../../../../hooks/useIngredientes'
import { usePromociones } from '../../../../hooks/usePromociones'
import { useVistaPreviaImagen } from '../../../../hooks/useVistaPreviaImagen'
import { etiquetaPromocion } from '../../../../components/Platos/promocionEtiqueta'
import { platoSchema } from '../../../../schemas/carta'
import { deletePlato, getPlato, quitarImagenPlato, subirImagenPlato, updatePlato } from '../../../../api/platos'
import { validarImagenPlato } from '../../../../utils/imagenPlato'
import { ZonaPeligro } from '../../../../components/ZonaPeligro/ZonaPeligro'
import {
  ETIQUETAS_ESTADO_INGREDIENTE,
  estadoDesdePivot,
  flagsDesdeEstado,
  type EstadoIngredientePlato,
} from '../../../../utils/ingredientePlato'

export function EditarPlatoPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [categoria_id, setCategoriaId] = useState('')
  // '' = sin promoción; se carga desde el plato y se envía siempre en el PUT.
  const [promocion_id, setPromocionId] = useState('')
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [precio, setPrecio] = useState('')
  // Imagen vigente en el server (URL pública) y archivo nuevo elegido.
  // La imagen no viaja en el PUT: tiene sus propios endpoints.
  const [imagenActual, setImagenActual] = useState<string | null>(null)
  const [archivo, setArchivo] = useState<File | null>(null)
  const [errorImagen, setErrorImagen] = useState<string | null>(null)
  // true = al guardar se ejecuta DELETE /platos/{id}/imagen.
  const [quitarImagen, setQuitarImagen] = useState(false)
  // Remount del <input type=file> (no controlado) al limpiarlo.
  const [recargaInput, setRecargaInput] = useState(0)
  const [disponible, setDisponible] = useState(true)
  // Estado por ingrediente id; los no presentes quedan fuera del plato.
  // El PUT reemplaza la lista completa del pivot con estos flags.
  const [ingredientes, setIngredientes] = useState<Record<number, EstadoIngredientePlato>>({})

  const vistaPrevia = useVistaPreviaImagen(archivo)
  // Lo que se muestra: el archivo nuevo, o la imagen del server mientras
  // no se haya pedido quitarla.
  const imagenVisible = vistaPrevia ?? (quitarImagen ? null : imagenActual)

  const {categorias, loadingCategorias, errorCategorias} = useCategorias()
  const {listaIngredientes, loadingIngredientes, errorIngredientes} = useIngredientes()
  const {promociones, loadingPromociones, errorPromociones} = usePromociones()

  const [cargando, setCargando] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [eliminando, setEliminando] = useState(false)
  const [errorApi, setErrorApi] = useState<string | null>(null)
  const [exito, setExito] = useState<string | null>(null)
  const [tocado, setTocado] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    getPlato(Number(id), controller.signal)
      .then(plato => {
        setCategoriaId(String(plato.categoria_id))
        setPromocionId(plato.promocion_id == null ? '' : String(plato.promocion_id))
        setNombre(plato.nombre)
        setDescripcion(plato.descripcion)
        setPrecio(String(plato.precio))
        setImagenActual(plato.imagen_url)
        setDisponible(plato.disponible)
        // `estadoDesdePivot` devuelve null para el caso inerte (sin flags):
        // ese ingrediente queda fuera del plato.
        setIngredientes(Object.fromEntries(
          plato.ingredientes
            .map(ing => [ing.id, estadoDesdePivot(ing.pivot)] as const)
            .filter((par): par is readonly [number, EstadoIngredientePlato] => par[1] !== null)
        ))
      })
      .catch(err => {
        if (!controller.signal.aborted) {
          setErrorApi(err instanceof Error ? err.message : 'Error desconocido al cargar el plato')
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setCargando(false)
      })
    return () => controller.abort()
  }, [id])

  const errores: Record<string, string> = {}
  // El PUT reemplaza la lista del pivot: cada ingrediente se envía con sus
  // flags explícitos (obligatorio / por defecto / agregar).
  const ingredientesConFlags = Object.entries(ingredientes).map(([idIngrediente, estado]) => ({
    ingrediente_id: Number(idIngrediente),
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
      if (typeof campo === 'string' && !errores[campo]) {
        errores[campo] = issue.message
      }
    }
  }

  function cambiarEstadoIngrediente(idIngrediente: number, estado: EstadoIngredientePlato | '') {
    setIngredientes(prev => {
      const siguiente = { ...prev }
      if (estado === '') delete siguiente[idIngrediente]
      else siguiente[idIngrediente] = estado
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
    // Elegir un archivo nuevo descarta el "quitar" pendiente.
    if (!problema) setQuitarImagen(false)
    // Un archivo inválido no queda seleccionado en el input.
    if (problema) setRecargaInput(n => n + 1)
  }

  function descartarImagen() {
    setArchivo(null)
    setErrorImagen(null)
    setRecargaInput(n => n + 1)
    setQuitarImagen(true)
  }

  async function handlerSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setTocado(true)
    setExito(null)
    setErrorApi(null)

    if (!resultados.success) return

    const problemaImagen = archivo ? validarImagenPlato(archivo) : null
    if (problemaImagen) {
      setErrorImagen(problemaImagen)
      return
    }

    setEnviando(true)
    try {
      const rta = await updatePlato(Number(id), resultados.data)
      setExito(rta.message)
      setTocado(false)

      // Imagen: va después de guardar los datos (endpoints propios). Si
      // falla, los datos YA quedaron guardados: se avisa sin revertir.
      if (archivo) {
        try {
          const subida = await subirImagenPlato(Number(id), archivo)
          setImagenActual(subida.plato.imagen_url)
          setArchivo(null)
          setRecargaInput(n => n + 1)
        } catch (err) {
          setErrorApi(`Los datos se guardaron, pero la imagen no se pudo actualizar: ${err instanceof Error ? err.message : 'error desconocido'}`)
        }
      } else if (quitarImagen && imagenActual) {
        try {
          const sinImagen = await quitarImagenPlato(Number(id))
          setImagenActual(sinImagen.plato.imagen_url)
          setQuitarImagen(false)
        } catch (err) {
          setErrorApi(`Los datos se guardaron, pero la imagen no se pudo quitar: ${err instanceof Error ? err.message : 'error desconocido'}`)
        }
      }
    } catch (err) {
      setErrorApi(err instanceof Error ? err.message : 'Error desconocido al actualizar el plato')
    } finally {
      setEnviando(false)
    }
  }

  async function handlerEliminar() {
    setEliminando(true)
    setErrorApi(null)
    try {
      await deletePlato(Number(id))
      navigate('/gerente/carta/platos')
    } catch (err) {
      setErrorApi(err instanceof Error ? err.message : 'Error desconocido al eliminar el plato')
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
        <h1 className={`text-headline-md ${s.title}`}>Editar plato</h1>
        <p className={`text-body-sm ${s.subtitle}`}>Modificá los datos del plato de la carta.</p>

        {exito && (
          <Alert variant='success' className='text-body-md d-flex flex-wrap align-items-center justify-content-between gap-2'>
            <span>{exito}</span>
            <Button
              className='text-label-md'
              variant='outline-success'
              size='sm'
              type='button'
              onClick={() => navigate('/gerente/carta/platos')}
            >
              Volver a la lista
            </Button>
          </Alert>
        )}

        {(errorCategorias || errorIngredientes || errorPromociones) &&
          <Alert variant='danger' className='text-body-md'>
            No se pudieron cargar las categorías, los ingredientes o las promociones. Verificá que el servidor esté activo
          </Alert>}
        {errorApi && <Alert variant='danger' className='text-body-md'>{errorApi}</Alert>}

          <Form onSubmit={handlerSubmit} noValidate>
            <div className={s.row}>
              <Form.Group className={s.field} controlId='editar-plato-nombre'>
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

              <Form.Group className={s.field} controlId='editar-plato-categoria'>
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

            <Form.Group className={s.field} controlId='editar-plato-descripcion'>
              <Form.Label className={`text-label-md ${s.label}`}>Descripción</Form.Label>
              <Form.Control
                className={s.input}
                as='textarea'
                rows={3}
                placeholder='Descripción del plato (opcional)'
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                isInvalid={tocado && !!errores.descripcion}
              />
              <Form.Control.Feedback type='invalid'>{errores.descripcion}</Form.Control.Feedback>
            </Form.Group>

            <div className={s.row}>
              <Form.Group className={s.field} controlId='editar-plato-precio'>
                <Form.Label className={`text-label-md ${s.label}`}>Precio</Form.Label>
                <Form.Control
                  className={s.input}
                  type='number'
                  min={0}
                  step='0.01'
                  placeholder='1500'
                  value={precio}
                  onChange={(e) => setPrecio(e.target.value)}
                  isInvalid={tocado && !!errores.precio}
                />
                <Form.Control.Feedback type='invalid'>{errores.precio}</Form.Control.Feedback>
              </Form.Group>

              <Form.Group className={s.field} controlId='editar-plato-imagen'>
                <Form.Label className={`text-label-md ${s.label}`}>Imagen</Form.Label>
                {imagenVisible ? (
                  <div className={s.imagenActual}>
                    <img className={s.vistaPrevia} src={imagenVisible} alt='Imagen del plato' />
                    <Button
                      className='text-label-sm'
                      variant='outline-danger'
                      size='sm'
                      type='button'
                      disabled={enviando}
                      onClick={descartarImagen}
                    >
                      <i className='bi bi-trash me-1' aria-hidden='true' />
                      Quitar imagen
                    </Button>
                  </div>
                ) : (
                  <p className={`text-body-sm ${s.ayuda}`}>Sin imagen cargada.</p>
                )}
                <Form.Control
                  key={recargaInput}
                  className={s.input}
                  type='file'
                  accept='image/jpeg,image/png,image/webp'
                  onChange={(e) => elegirArchivo((e.target as HTMLInputElement).files?.[0] ?? null)}
                  isInvalid={!!errorImagen}
                  disabled={enviando}
                />
                <Form.Control.Feedback type='invalid'>{errorImagen}</Form.Control.Feedback>
                <p className={`text-body-sm ${s.ayuda}`}>
                  JPG, PNG o WEBP de hasta 2 MB.
                  {quitarImagen && ' La imagen se quitará al guardar los cambios.'}
                </p>
              </Form.Group>
            </div>

            <Form.Group className={s.field} controlId='editar-plato-promocion'>
              <Form.Label className={`text-label-md ${s.label}`}>Promoción</Form.Label>
              <Form.Select
                className={s.input}
                value={promocion_id}
                onChange={(e) => setPromocionId(e.target.value)}
                disabled={loadingPromociones}
              >
                <option value=''>Sin promoción</option>
                {/* Activas + la actual, por si quedó inactiva: así el PUT no la desvincula a ciegas. */}
                {promociones
                  .filter(p => p.activo || String(p.id) === promocion_id)
                  .map(p => (
                    <option value={p.id} key={p.id}>
                      {p.nombre} ({etiquetaPromocion(p)}){p.activo ? '' : ' — inactiva'}
                    </option>
                  ))}
              </Form.Select>
              <p className={`text-body-sm ${s.ayuda}`}>
                {loadingPromociones
                  ? 'Cargando promociones...'
                  : 'El descuento se aplica al precio al realizar el pedido.'}
              </p>
            </Form.Group>

            <Form.Group className={s.field} controlId='editar-plato-ingredientes'>
              <Form.Label className={`text-label-md ${s.label}`}>Ingredientes</Form.Label>
              {/* <p className={`text-body-sm ${s.ayuda}`}>
                Definí cómo participa cada ingrediente en el plato: obligatorio (siempre va),
                por defecto (el cliente puede quitarlo) o para agregar (el cliente lo agrega y
                se le cobra su precio adicional).
              </p> */}
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

            <Form.Group className={s.field} controlId='editar-plato-disponible'>
              <div className={s.switchWrap}>
                <Form.Check
                  type='switch'
                  id='editar-plato-disponible-switch'
                  checked={disponible}
                  onChange={(e) => setDisponible(e.target.checked)}
                />
                <Form.Label className={`text-label-md ${s.label} mb-0`}>Disponible</Form.Label>
              </div>
            </Form.Group>

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
                onClick={() => navigate('/gerente/carta/platos')}
              >
                Cancelar edición
              </Button>
            </div>
          </Form>
      </Card>
      <div className={s.zonaWrap}>
        <ZonaPeligro
          descripcion='Eliminar este plato lo quitará de la carta digital: dejará de estar disponible y no podrá ser ordenado. Esta acción no se puede deshacer.'
          textoBoton='Eliminar plato'
          eliminando={eliminando}
          onEliminar={handlerEliminar}
        />
      </div>
    </div>
  )
}
