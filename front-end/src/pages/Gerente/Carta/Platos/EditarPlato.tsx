import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Alert, Button, Card, Form, Spinner } from 'react-bootstrap'
import s from './Platos.module.css'
import { useCategorias } from '../../../../hooks/useCategorias'
import { useIngredientes } from '../../../../hooks/useIngredientes'
import { usePromociones } from '../../../../hooks/usePromociones'
import { etiquetaPromocion } from '../../../../components/Platos/promocionEtiqueta'
import { platoSchema } from '../../../../schemas/carta'
import { deletePlato, getPlato, updatePlato } from '../../../../api/platos'
import { ZonaPeligro } from '../../../../components/ZonaPeligro/ZonaPeligro'

export function EditarPlatoPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [categoria_id, setCategoriaId] = useState('')
  // '' = sin promoción; se carga desde el plato y se envía siempre en el PUT.
  const [promocion_id, setPromocionId] = useState('')
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [precio, setPrecio] = useState('')
  const [imagen, setImagen] = useState('')
  const [disponible, setDisponible] = useState(true)
  const [ingredientes, setIngredientes] = useState<number[]>([])
  // Flags originales del pivot (opcional/por_defecto) por ingrediente id: se
  // reenvían al guardar para que el PUT no los resetee a los defaults.
  const [flagsOriginales, setFlagsOriginales] = useState<Record<number, { opcional: boolean; por_defecto: boolean }>>({})

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
        setImagen(plato.imagen ?? '')
        setDisponible(plato.disponible)
        setIngredientes(plato.ingredientes.map(ing => ing.id))
        setFlagsOriginales(Object.fromEntries(
          plato.ingredientes.map(ing => [ing.id, ing.pivot])
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
  // Los ingredientes nuevos (recién tildados) se envían sin flags: el backend
  // les pone los defaults opcional=true, por_defecto=true.
  const ingredientesConFlags = ingredientes.map(idIngrediente => ({
    ingrediente_id: idIngrediente,
    ...flagsOriginales[idIngrediente],
  }))
  const resultados = platoSchema.safeParse({
    categoria_id,
    promocion_id: promocion_id === '' ? null : promocion_id,
    nombre,
    descripcion,
    precio,
    imagen,
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

  function toggleIngrediente(idIngrediente: number) {
    setIngredientes(prev =>
      prev.includes(idIngrediente) ? prev.filter(i => i !== idIngrediente) : [...prev, idIngrediente]
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
      const rta = await updatePlato(Number(id), resultados.data)
      setExito(rta.message)
      setTocado(false)
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
                  : 'La promoción seleccionada se muestra en la tarjeta del plato y el descuento se aplica al precio al realizar el pedido.'}
              </p>
            </Form.Group>

            <Form.Group className={s.field} controlId='editar-plato-ingredientes'>
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
                      id={`editar-ingrediente-${ing.id}`}
                      label={ing.nombre}
                      checked={ingredientes.includes(ing.id)}
                      onChange={() => toggleIngrediente(ing.id)}
                      isInvalid={tocado && !!errores.ingredientes}
                    />
                  ))
                )}
              </div>
              <Form.Control.Feedback type='invalid'>{errores.ingredientes}</Form.Control.Feedback>
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
