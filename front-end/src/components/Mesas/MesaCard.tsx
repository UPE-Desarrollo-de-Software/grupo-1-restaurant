import { Card } from 'react-bootstrap'
import { Link, useLocation } from 'react-router-dom'
import type { Mesa } from '../../types/Mesa'
import s from './MesaCard.module.css'

// Solo lectura + acción principal (patrón de los hubs del proyecto): el
// cierre de visita vive en la mesa concreta (EditarMesa del gerente o
// MozoMesa del mozo).
// El botón del footer depende de la sección: en el panel del gerente
// edita la mesa; en /mozo la "atende" (detalle de pedidos).

// "2026-10-19 20:15:00" (del backend) → fecha corta local.
const formatearFecha = (fecha: string): string => {
  const momento = new Date(fecha.replace(' ', 'T'))
  if (Number.isNaN(momento.getTime())) return fecha
  return momento.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
}

export function MesaCard({ mesa }: { mesa: Mesa }) {
  const enMozo = useLocation().pathname.startsWith('/mozo')
  return (
    <Card className={s.card}>
      <Card.Body className={s.body}>
        <div className={s.fila}>
          <span className={`text-label-sm ${s.indice}`}>#{String(mesa.id).padStart(2, '0')}</span>

          <div className={s.info}>
            {mesa.grupo_codigo != null && (
              <div className={s.badges}>
                <span className={`text-label-sm ${s.badgeGrupo}`}>Grupo {mesa.grupo_codigo}</span>
              </div>
            )}
            <h3 className={`text-headline-sm ${s.titulo}`}>{mesa.capacidad} lugares</h3>
            <p className={`text-body-sm ${s.detalle}`}>
              {mesa.ocupada_desde
                ? `Ocupada desde ${formatearFecha(mesa.ocupada_desde)}`
                : 'Sin visita en curso'}
            </p>
          </div>
        </div>

        <div className={s.footer}>
          <Link
            className={`btn btn-outline-primary btn-sm text-label-md ${s.botonEditar}`}
            to={enMozo ? `/mozo/mesas/${mesa.id}` : `/gerente/mesas/gestion/${mesa.id}/editar`}
          >
            <i className={`bi ${enMozo ? 'bi-arrow-right' : 'bi-pencil'} ${s.iconoEditar}`} aria-hidden="true" />
            {enMozo ? 'Atender' : 'Editar'}
          </Link>
        </div>
      </Card.Body>
    </Card>
  )
}
