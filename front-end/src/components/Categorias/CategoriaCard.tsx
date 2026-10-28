import { Card } from 'react-bootstrap'
import type { Categoria } from '../../types/Menu'
import s from './CategoriaCard.module.css'
import { Link } from 'react-router-dom'

interface CategoriaCardProps {
  categoria: Categoria
}

export function CategoriaCard({ categoria }: CategoriaCardProps) {
  return (
    <Card className={s.card}>
      <Card.Body className={s.body}>
        <div className={s.fila}>
          <span className={`text-label-sm ${s.indice}`}>#{String(categoria.id).padStart(2, '0')}</span>

          <div className={s.info}>
            <div className={s.badges}>
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

        <div className={s.footer}>
          <Link className={`btn btn-outline-primary btn-sm text-label-md ${s.botonEditar}`} to={`/gerente/carta/categorias/${categoria.id}/editar`}>
            <i className={`bi bi-pencil ${s.iconoEditar}`} aria-hidden="true" />
            Editar
          </Link>
        </div>
      </Card.Body>
    </Card>
  )
}
