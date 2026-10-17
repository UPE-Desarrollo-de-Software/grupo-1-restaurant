import { useState } from 'react'
import { Card, Form } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import type { PlatoListar } from '../../types/Menu'
import s from './PlatoCard.module.css'

const formatearPrecio = (precio: number): string =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(precio)

interface PlatoCardProps {
  plato: PlatoListar
}

export function PlatoCard({ plato }: PlatoCardProps) {
  const [override, setOverride] = useState<boolean | null>(null)
  const disponible = override ?? plato.disponible
  return (
    <Card className={s.card}>
      <Card.Body className={s.body}>
        <div className={s.fila}>
          <div className={s.media}>
            <span className={`text-label-sm ${s.indice}`}>#{String(plato.id).padStart(2, '0')}</span>
            <img
              className={s.imagen}
              src={plato.imagen ?? undefined}
              alt={plato.nombre}
              loading='lazy'
            />
          </div>

          <div className={s.info}>
            <div className={s.badges}>
              <span className={`text-label-sm ${s.badgeCategoria}`}>{plato.categoria_nombre}</span>
              <span className={`text-label-sm ${disponible ? s.badgeActivo : s.badgePausado}`}>
                {disponible ? 'Activo' : 'Pausado'}
              </span>
            </div>
            <h3 className={`text-headline-sm ${s.nombre}`}>{plato.nombre}</h3>
            <p className={`text-body-sm ${s.descripcion}`}>{plato.descripcion}</p>
            <p className={`text-price-display ${s.precio}`}>{formatearPrecio(plato.precio)}</p>
          </div>
        </div>

        <div className={s.footer}>
          <Link className={`btn btn-outline-primary btn-sm text-label-md ${s.botonEditar}`} to={`/gerente/carta/platos/${plato.id}/editar`}>
            <i className={`bi bi-pencil ${s.iconoEditar}`} aria-hidden="true" />
            Editar
          </Link>

          <div className={s.switchWrap}>
            <span className={`text-label-md ${s.switchLabel}`}>{disponible ? 'Disponible' : 'Pausado'}</span>
            <Form.Check
              type='switch'
              id={`disponible-${plato.id}`}
              checked={disponible}
              onChange={() => setOverride(!disponible)}
            />
          </div>
        </div>
      </Card.Body>
    </Card>
  )
}
