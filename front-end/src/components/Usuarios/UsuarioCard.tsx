import { Card } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import type { Usuario } from '../../types/Auth'
import s from './UsuarioCard.module.css'

interface UsuarioCardProps {
  usuario: Usuario
}

export function UsuarioCard({ usuario }: UsuarioCardProps) {
  return (
    <Card className={s.card}>
      <Card.Body className={s.body}>
        <div className={s.fila}>
          <span className={`text-label-sm ${s.indice}`}>#{String(usuario.id).padStart(2, '0')}</span>

          <div className={s.info}>
            <div className={s.badges}>
              <span className={`text-label-sm ${s.badgeRol}`}>{usuario.rol.nombre}</span>
              <span className={`text-label-sm ${usuario.activo ? s.badgeActivo : s.badgeInactivo}`}>
                {usuario.activo ? 'Activo' : 'Inactivo'}
              </span>
            </div>
            <h3 className={`text-headline-sm ${s.nombre}`}>{usuario.nombre}</h3>
            <p className={`text-body-sm ${s.email}`}>{usuario.email}</p>
          </div>
        </div>

        <div className={s.footer}>
          <Link className={`btn btn-outline-primary btn-sm text-label-md ${s.botonEditar}`} to={`/gerente/usuarios/${usuario.id}/editar`}>
            <i className={`bi bi-pencil ${s.iconoEditar}`} aria-hidden="true" />
            Editar
          </Link>
        </div>
      </Card.Body>
    </Card>
  )
}
