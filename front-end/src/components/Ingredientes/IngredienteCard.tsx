import { Card } from 'react-bootstrap'
import type { Ingrediente } from '../../types/Menu'
import s from './IngredienteCard.module.css'
import { Link } from 'react-router-dom'

const formatearPrecio = (precio: number): string =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(precio)

interface IngredienteCardProps {
  ingrediente: Ingrediente
}

export function IngredienteCard({ ingrediente }: IngredienteCardProps) {
  return (
    <Card className={s.card}>
      <Card.Body className={s.body}>
        <div className={s.fila}>
          <span className={`text-label-sm ${s.indice}`}>#{String(ingrediente.id).padStart(2, '0')}</span>

          <div className={s.info}>
            <div className={s.badges}>
              {/* <span className={`text-label-sm ${ingrediente.opcional ? s.badgeOpcional : s.badgeObligatorio}`}>
                {ingrediente.opcional ? 'Opcional' : 'Obligatorio'}
              </span> */}
            </div>
            <h3 className={`text-headline-sm ${s.nombre}`}>{ingrediente.nombre}</h3>
          </div>

          <div className={s.precioWrap}>
            <p className={`text-label-sm ${s.precioLabel}`}>Precio adicional</p>
            <p className={`text-price-display ${s.precio}`}>{formatearPrecio(ingrediente.precioAdicional)}</p>
          </div>
        </div>

        <div className={s.footer}>
          <Link className={`btn btn-outline-primary btn-sm text-label-md ${s.botonEditar}`} to={`/gerente/carta/ingredientes/${ingrediente.id}/editar`}>
            <i className={`bi bi-pencil ${s.iconoEditar}`} aria-hidden="true" />
            Editar
          </Link>
        </div>

      </Card.Body>
    </Card>
  )
}
