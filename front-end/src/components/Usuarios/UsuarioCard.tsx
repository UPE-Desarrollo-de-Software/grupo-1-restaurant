import { Card } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import type { Usuario } from '../../types/Auth'
import t from '../Tarjeta/Tarjeta.module.css'
import s from './UsuarioCard.module.css'

interface UsuarioCardProps {
  usuario: Usuario
}

export function UsuarioCard({ usuario }: UsuarioCardProps) {
  return (
    <Card className={t.card}>
      <Card.Body className={t.body}>
        <div className={t.fila}>
          <span className={`text-label-sm ${t.indice}`}>#{String(usuario.id).padStart(2, '0')}</span>

          <div className={t.info}>
            <div className={t.badges}>
              <span className={`text-label-sm ${s.badgeRol}`}>{usuario.rol.nombre}</span>
              <span className={`text-label-sm ${usuario.activo ? s.badgeActivo : s.badgeInactivo}`}>
                {usuario.activo ? 'Activo' : 'Inactivo'}
              </span>
            </div>
            <h3 className={`text-headline-sm ${s.nombre}`}>{usuario.nombre}</h3>
            <p className={`text-body-sm ${s.email}`}>{usuario.email}</p>
          </div>
        </div>

        <div className={`${t.footer} ${t.footerDerecha}`}>
          <Link className={`btn btn-outline-primary btn-sm rounded-pill text-label-md ${t.botonAccion}`} to={`/gerente/usuarios/${usuario.id}/editar`}>
            <i className={`bi bi-pencil ${t.iconoAccion}`} aria-hidden="true" />
            Editar
          </Link>
        </div>
      </Card.Body>
    </Card>
  )
}
