import { Card } from 'react-bootstrap'
import type { Categoria } from '../../types/Menu'
import t from '../Tarjeta/Tarjeta.module.css'
import s from './CategoriaCard.module.css'
import { Link } from 'react-router-dom'

interface CategoriaCardProps {
  categoria: Categoria
}

export function CategoriaCard({ categoria }: CategoriaCardProps) {
  return (
    <Card className={t.card}>
      <Card.Body className={t.body}>
        <div className={t.fila}>
          <span className={`text-label-sm ${t.indice}`}>#{String(categoria.id).padStart(2, '0')}</span>

          <div className={t.info}>
            <div className={t.badges}>
              <span className={`text-label-sm ${categoria.activo ? s.badgeActiva : s.badgeInactiva}`}>
                {categoria.activo ? 'Activa' : 'Inactiva'}
              </span>
            </div>
            <h3 className={`text-headline-sm ${s.nombre}`}>{categoria.nombre}</h3>
            {categoria.descripcion && (
              <p className={`text-body-sm ${s.descripcion}`}>{categoria.descripcion}</p>
            )}
          </div>
        </div>

        <div className={`${t.footer} ${t.footerDerecha}`}>
          <Link className={`btn btn-outline-primary btn-sm text-label-md ${t.botonAccion}`} to={`/gerente/carta/categorias/${categoria.id}/editar`}>
            <i className={`bi bi-pencil ${t.iconoAccion}`} aria-hidden="true" />
            Editar
          </Link>
        </div>
      </Card.Body>
    </Card>
  )
}
