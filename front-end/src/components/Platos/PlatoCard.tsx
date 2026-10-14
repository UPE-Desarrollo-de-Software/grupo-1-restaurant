import { Card, Form } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import type { ProductoListar } from '../../types/Menu'
import s from './PlatoCard.module.css'

const formatearPrecio = (precio: number): string =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(precio)

interface PlatoCardProps {
  producto: ProductoListar
  disponible: boolean
  onToggle: () => void
}

export function PlatoCard({ producto, disponible, onToggle }: PlatoCardProps) {
  return (
    <Card className={s.card}>
      <Card.Body className={s.body}>
        <div className={s.fila}>
          <div className={s.media}>
            <span className={`text-label-sm ${s.indice}`}>#{String(producto.id).padStart(2, '0')}</span>
            <img
              className={s.imagen}
              src={producto.imagen ?? undefined}
              alt={producto.nombre}
              loading='lazy'
            />
          </div>

          <div className={s.info}>
            <div className={s.badges}>
              <span className={`text-label-sm ${s.badgeCategoria}`}>{producto.categoria_nombre}</span>
              <span className={`text-label-sm ${disponible ? s.badgeActivo : s.badgePausado}`}>
                {disponible ? 'Activo' : 'Pausado'}
              </span>
            </div>
            <h3 className={`text-headline-sm ${s.nombre}`}>{producto.nombre}</h3>
            <p className={`text-body-sm ${s.descripcion}`}>{producto.descripcion}</p>
            <p className={`text-price-display ${s.precio}`}>{formatearPrecio(producto.precio)}</p>
          </div>
        </div>

        <div className={s.footer}>
          <Link className={`btn btn-outline-primary btn-sm text-label-md ${s.botonEditar}`} to={`/gerente/carta/productos/${producto.id}/editar`}>
            <i className={`bi bi-pencil ${s.iconoEditar}`} aria-hidden="true" />
            Editar
          </Link>

          <div className={s.switchWrap}>
            <span className={`text-label-md ${s.switchLabel}`}>{disponible ? 'Disponible' : 'Pausado'}</span>
            <Form.Check
              type='switch'
              id={`disponible-${producto.id}`}
              checked={disponible}
              onChange={onToggle}
            />
          </div>
        </div>
      </Card.Body>
    </Card>
  )
}
