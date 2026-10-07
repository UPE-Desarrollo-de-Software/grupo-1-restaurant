import { Button } from 'react-bootstrap'
import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { getIngredientesProducto } from '../../api/productos'
import { useProductos } from '../../hooks/useProductos'
import type { Ingrediente, Producto } from '../../types/Producto'
import s from './productDetail.module.css'

const PRODUCTO_DEMO: Producto & { ingredientes: Ingrediente[] } = {
  id: 1,
  categoria_nombre: 'Milanesas',
  categoria_id: 1,
  nombre: 'Milanesa Napolitana Suprema',
  descripcion:
    'Milanesa de nalga con salsa de tomate, jamón cocido y mozzarella fundida.',
  precio: 12800,
  imagen: '',
  disponible: 1,
  ingredientes: [
    { id: 1, nombre: 'Lomo vacuno' },
    { id: 2, nombre: 'Pan rallado artesanal' },
    { id: 3, nombre: 'Huevos de campo' },
    { id: 4, nombre: 'Salsa de tomate casera' },
    { id: 5, nombre: 'Jamón cocido natural' },
    { id: 6, nombre: 'Queso mozzarella' },
    { id: 7, nombre: 'Orégano fresco' },
  ],
}

const formatearPrecio = (precio: number): string =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(precio)

export function ProductDetailPage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()

  if (searchParams.get('preview') === '1') {
    return (
      <ProductDetailView
        producto={PRODUCTO_DEMO}
        ingredientes={PRODUCTO_DEMO.ingredientes}
        esDemo
      />
    )
  }

  return <ProductDetailFromApi id={id} />
}

function ProductDetailFromApi({ id }: { id: string | undefined }) {
  const { productos, loading, error } = useProductos()
  const productoId = Number(id)
  const producto = productos.find((item) => item.id === productoId)
  const [estadoIngredientes, setEstadoIngredientes] = useState<{
    productoId: number
    ingredientes: Ingrediente[]
    error: string | null
  }>({ productoId: 0, ingredientes: [], error: null })

  useEffect(() => {
    if (!Number.isInteger(productoId) || productoId <= 0) return

    const controller = new AbortController()

    async function cargarIngredientes() {
      try {
        const data = await getIngredientesProducto(productoId, controller.signal)
        setEstadoIngredientes({ productoId, ingredientes: data, error: null })
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setEstadoIngredientes({
          productoId,
          ingredientes: [],
          error: err instanceof Error
            ? err.message
            : 'Error desconocido al cargar los ingredientes',
        })
      }
    }

    cargarIngredientes()

    return () => controller.abort()
  }, [productoId])

  if (loading) {
    return <p className={s.message}>Cargando producto...</p>
  }

  if (error) {
    return (
      <section className={s.message} role="alert">
        <p>{error}</p>
        <Link to="/menu">Volver a la carta</Link>
      </section>
    )
  }

  if (!producto) {
    return (
      <section className={s.message}>
        <p>No encontramos el producto solicitado.</p>
        <Link to="/menu">Volver a la carta</Link>
      </section>
    )
  }

  return (
    <ProductDetailView
      producto={producto}
      ingredientes={
        estadoIngredientes.productoId === productoId
          ? estadoIngredientes.ingredientes
          : []
      }
      ingredientesLoading={estadoIngredientes.productoId !== productoId}
      ingredientesError={
        estadoIngredientes.productoId === productoId
          ? estadoIngredientes.error
          : null
      }
    />
  )
}

function ProductDetailView({
  producto,
  esDemo = false,
  ingredientes = [],
  ingredientesLoading = false,
  ingredientesError = null,
}: {
  producto: Producto
  esDemo?: boolean
  ingredientes?: Ingrediente[]
  ingredientesLoading?: boolean
  ingredientesError?: string | null
}) {
  const estaDisponible = producto.disponible !== 0

  return (
    <article className={s.page}>
      {esDemo && (
        <p className={s.demoNotice}>
          Vista de demostración: se muestran datos de ejemplo.
        </p>
      )}
      <Link to="/menu" className={s.backLink}>
        <i className="bi bi-arrow-left" aria-hidden="true" />
        Volver a la carta
      </Link>

      <div className={s.hero}>
        {producto.imagen ? (
          <img
            className={s.image}
            src={producto.imagen}
            alt={producto.nombre}
          />
        ) : (
          <div className={s.imagePlaceholder} role="img" aria-label="Imagen no disponible">
            <i className="bi bi-image" aria-hidden="true" />
            <span>Imagen no disponible</span>
          </div>
        )}
        <div className={s.badges}>
          {producto.categoria_nombre && (
            <span className={s.category}>
              <i className="bi bi-tag" aria-hidden="true" />
              {producto.categoria_nombre}
            </span>
          )}
          <span className={estaDisponible ? s.available : s.unavailable}>
            {estaDisponible ? 'Disponible' : 'No disponible'}
          </span>
        </div>
      </div>

      <div className={s.summary}>
        <div className={s.heading}>
          <h1 className={s.name}>{producto.nombre}</h1>
          <p className={s.priceLabel}>Precio carta</p>
          <p className={s.price}>{formatearPrecio(producto.precio)}</p>
        </div>

        {producto.descripcion && (
          <section className={s.description} aria-label="Descripción del producto">
            <p>{producto.descripcion}</p>
          </section>
        )}

        {(ingredientesLoading || ingredientesError || ingredientes.length > 0) && (
          <section className={s.ingredients} aria-labelledby="ingredients-title">
            <h2 id="ingredients-title" className={s.ingredientsTitle}>
              <i className="bi bi-card-checklist" aria-hidden="true" />
              Ingredientes principales
            </h2>
            {ingredientesLoading ? (
              <p className={s.ingredientsMessage}>Cargando ingredientes...</p>
            ) : ingredientesError ? (
              <p className={s.ingredientsError} role="alert">{ingredientesError}</p>
            ) : (
              <ul className={s.ingredientsList}>
                {ingredientes.map((ingrediente) => (
                  <li key={ingrediente.id} className={s.ingredient}>
                    {ingrediente.nombre}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <Button
          variant="primary"
          className={s.orderButton}
          disabled={!estaDisponible}
          type="button"
        >
          <i className="bi bi-basket" aria-hidden="true" />
          {estaDisponible ? 'Agregar al pedido' : 'Producto no disponible'}
        </Button>
      </div>
    </article>
  )
}
