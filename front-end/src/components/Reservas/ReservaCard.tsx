import { Card } from 'react-bootstrap'
import { Link, useLocation } from 'react-router-dom'
import { baseReservas } from '../../navigation/rutas'
import type { EstadoReserva, Reserva } from '../../types/Reserva'
import s from './ReservaCard.module.css'

// No se exportan: react-refresh/only-export-components.
const ESTADOS: Record<EstadoReserva, string> = {
  pendiente: 'Pendiente',
  cancelada: 'Cancelada',
  finalizada: 'Finalizada',
  no_asistio: 'No asistió',
}

const CLASES_ESTADO: Record<EstadoReserva, string> = {
  pendiente: 'badgePendiente',
  cancelada: 'badgeCancelada',
  finalizada: 'badgeFinalizada',
  no_asistio: 'badgeNoAsistio',
}

// Las fechas llegan "YYYY-MM-DD" (también tolera datetime cortando a 10).
const formatearFecha = (fecha: string): string => {
  const [anio, mes, dia] = fecha.slice(0, 10).split('-')
  return `${dia}/${mes}/${anio}`
}

interface ReservaCardProps {
  reserva: Reserva
}

export function ReservaCard({ reserva }: ReservaCardProps) {
  const esPendiente = reserva.estado === 'pendiente'
  // La misma card se sirve en /gerente/reservas y /mozo/reservas.
  const base = baseReservas(useLocation().pathname)
  return (
    <Card className={s.card}>
      <Card.Body className={s.body}>
        <div className={s.fila}>
          <span className={`text-label-sm ${s.indice}`}>#{String(reserva.id).padStart(2, '0')}</span>

          <div className={s.info}>
            <div className={s.badges}>
              <span className={`text-label-sm ${s.badgeMesa}`}>Mesa #{reserva.mesa_id}</span>
              <span className={`text-label-sm ${s[CLASES_ESTADO[reserva.estado]]}`}>
                {ESTADOS[reserva.estado]}
              </span>
            </div>
            <h3 className={`text-headline-sm ${s.nombre}`}>{reserva.contacto_solicitante}</h3>
            <p className={`text-body-sm ${s.detalle}`}>
              {formatearFecha(reserva.fecha)} · {reserva.hora} h · {reserva.cantPersonas} {reserva.cantPersonas === 1 ? 'persona' : 'personas'}
            </p>
          </div>
        </div>

        <div className={s.footer}>
          <Link className={`btn btn-outline-primary btn-sm text-label-md ${s.botonGestionar}`} to={`${base}/${reserva.id}/editar`}>
            <i className={`bi bi-pencil ${s.iconoEditar}`} aria-hidden="true" />
            {esPendiente ? 'Gestionar' : 'Ver'}
          </Link>
        </div>
      </Card.Body>
    </Card>
  )
}
