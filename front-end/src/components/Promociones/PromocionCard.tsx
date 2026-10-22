import { Card } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import type { Promocion } from '../../types/Menu'
import s from './PromocionCard.module.css'

const formatearPrecio = (precio: number): string =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(precio)

// No se exportan: react-refresh/only-export-components.
const TIPOS: Record<Promocion['tipo'], string> = {
  porcentaje: 'Porcentaje',
  monto_fijo: 'Monto fijo',
  precio_fijo: 'Precio fijo',
  '2x1': '2x1',
}

const formatearValor = (promocion: Promocion): string => {
  if (promocion.tipo === '2x1') return '2x1'
  if (promocion.valor === null) return '—'
  if (promocion.tipo === 'porcentaje') return `${promocion.valor} %`
  return formatearPrecio(promocion.valor)
}

// Las fechas llegan "YYYY-MM-DD" (también tolera datetime cortando a 10).
const formatearFecha = (fecha: string): string => {
  const [anio, mes, dia] = fecha.slice(0, 10).split('-')
  return `${dia}/${mes}/${anio}`
}

const ventanaDeFechas = (promocion: Promocion): string | null => {
  const { fecha_inicio, fecha_fin } = promocion
  if (fecha_inicio && fecha_fin) return `Del ${formatearFecha(fecha_inicio)} al ${formatearFecha(fecha_fin)}`
  if (fecha_inicio) return `Desde ${formatearFecha(fecha_inicio)}`
  if (fecha_fin) return `Hasta ${formatearFecha(fecha_fin)}`
  return null
}

interface PromocionCardProps {
  promocion: Promocion
}

export function PromocionCard({ promocion }: PromocionCardProps) {
  const fechas = ventanaDeFechas(promocion)
  return (
    <Card className={s.card}>
      <Card.Body className={s.body}>
        <div className={s.fila}>
          <span className={`text-label-sm ${s.indice}`}>#{String(promocion.id).padStart(2, '0')}</span>

          <div className={s.info}>
            <div className={s.badges}>
              <span className={`text-label-sm ${s.badgeTipo}`}>{TIPOS[promocion.tipo]}</span>
              <span className={`text-label-sm ${promocion.activo ? s.badgeActiva : s.badgeInactiva}`}>
                {promocion.activo ? 'Activa' : 'Inactiva'}
              </span>
            </div>
            <h3 className={`text-headline-sm ${s.nombre}`}>{promocion.nombre}</h3>
            <p className={`text-body-md ${s.descuento}`}>{formatearValor(promocion)}</p>
            {fechas && <p className={`text-label-sm ${s.fechas}`}>{fechas}</p>}
          </div>
        </div>

        <div className={s.footer}>
          <Link className={`btn btn-outline-primary btn-sm text-label-md ${s.botonEditar}`} to={`/gerente/carta/promociones/${promocion.id}/editar`}>
            <i className={`bi bi-pencil ${s.iconoEditar}`} aria-hidden="true" />
            Editar
          </Link>
        </div>
      </Card.Body>
    </Card>
  )
}
