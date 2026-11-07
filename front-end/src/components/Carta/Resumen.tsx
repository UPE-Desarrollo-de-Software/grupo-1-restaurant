import type { ItemLista, Tipo } from '../../hooks/useDatos'
import type { Categoria, PlatoListar, Promocion } from '../../types/Menu'
import type { Reserva } from '../../types/Reserva'
import type { Usuario } from '../../types/Auth'
import s from './Resumen.module.css'

// Los ingredientes no tienen estado (el modelo del backend solo tiene
// nombre y precioAdicional), por eso solo muestran el conteo de totales.
// Las mesas tampoco muestran estados en la UI: solo el total.
const ETIQUETAS: Record<Tipo, { activos?: string; pausados?: string }> = {
  plato: { activos: 'Disponibles', pausados: 'Pausados' },
  categoria: { activos: 'Activas', pausados: 'Inactivas' },
  ingrediente: {},
  usuario: { activos: 'Activos', pausados: 'Inactivos' },
  promocion: { activos: 'Activas', pausados: 'Inactivas' },
  // "Activos" = pendientes de resolver; el resto ya cerraron
  // (cancelada, finalizada o no asistió).
  reserva: { activos: 'Pendientes', pausados: 'Resueltas' },
  mesa: {},
}

// El backend manda `disponible` en platos, `activo` en categorías,
// usuarios y promociones, y `estado === 'pendiente'` en reservas.
function contarActivos(items: ItemLista[], tipo: Tipo): number {
  if (tipo === 'reserva') {
    return items.filter(item => (item as Reserva).estado === 'pendiente').length
  }
  return items.filter(item =>
    tipo === 'plato'
      ? (item as PlatoListar).disponible
      : (item as Categoria | Usuario | Promocion).activo
  ).length
}

// No se exporta: react-refresh/only-export-components.
function calcularStats(items: ItemLista[], tipo: Tipo) {
  const stats = [
    { label: 'Totales', valor: items.length, punto: 'puntoTotales' },
  ]

  const etiquetas = ETIQUETAS[tipo]
  if (etiquetas.activos && etiquetas.pausados) {
    const activos = contarActivos(items, tipo)
    stats.push(
      { label: etiquetas.activos, valor: activos, punto: 'puntoDisponibles' },
      { label: etiquetas.pausados, valor: items.length - activos, punto: 'puntoPausados' },
    )
  }

  return stats
}

export function Resumen({ tipo, items, loading }: { tipo: Tipo; items: ItemLista[]; loading?: boolean }) {
  const stats = calcularStats(items, tipo)

  return (
    <div className={s.grid}>
      {stats.map(stat => (
        <div key={stat.label} className={s.item}>
          <p className={`text-headline-md ${s.valor}`}>{loading ? '…' : stat.valor}</p>
          <p className={`text-label-md ${s.label}`}>
            <span className={`${s.punto} ${s[stat.punto]}`} aria-hidden="true" />
            {stat.label}
          </p>
        </div>
      ))}
    </div>
  )
}
