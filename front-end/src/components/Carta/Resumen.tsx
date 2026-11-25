import type { ItemLista, Tipo } from '../../hooks/useDatos'
import type { Categoria, PlatoListar, Promocion } from '../../types/Menu'
import type { Reserva } from '../../types/Reserva'
import type { Usuario } from '../../types/Auth'
import type { EstadoVisitaMesa, Mesa } from '../../types/Mesa'
import {
  ETIQUETAS_ESTADO_VISITA_PLURAL,
  ORDEN_ESTADOS_VISITA,
  contarMesasPorEstado,
} from '../../utils/mesas'
import s from './Resumen.module.css'

// Los ingredientes no tienen estado (el modelo del backend solo tiene
// nombre y precioAdicional), por eso solo muestran el conteo de totales.
// Las mesas usan el estado de la VISITA (derivado de sus pedidos), que
// no es el `estado` de la mesa: se cuenta en `calcularStats`.
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

// Punto de color por estado de la visita (clases de este módulo).
const PUNTO_ESTADO_VISITA: Record<EstadoVisitaMesa, string> = {
  eligiendo: 'puntoEligiendo',
  en_cocina: 'puntoEnCocina',
  listo: 'puntoListo',
  servido: 'puntoServido',
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
  // Mesas: 3 indicadores excluyentes por visita (En cocina / Listos /
  // Servidos). Cada mesa cae en uno solo; las que todavía no tienen
  // pedidos en el circuito (`eligiendo`) no se cuentan.
  if (tipo === 'mesa') {
    const conteo = contarMesasPorEstado(items as Mesa[])
    return ORDEN_ESTADOS_VISITA.map(estado => ({
      label: ETIQUETAS_ESTADO_VISITA_PLURAL[estado],
      valor: conteo[estado],
      punto: PUNTO_ESTADO_VISITA[estado],
    }))
  }

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

interface ResumenProps {
  tipo: Tipo
  items: ItemLista[]
  loading?: boolean
  // 'grid' (default) = tarjetas con el número grande, como venían usando los
  // hubs. 'compacta' = una sola fila (Diseño 2.0), la que usa PlatosHub.
  variante?: 'grid' | 'compacta'
}

export function Resumen({ tipo, items, loading, variante = 'grid' }: ResumenProps) {
  const stats = calcularStats(items, tipo)

  // Fila compacta: punto de estado + valor + etiqueta, todo en una línea.
  // El valor de "Totales" va en el color primario del proyecto.
  if (variante === 'compacta') {
    return (
      <div className={s.compacta}>
        {stats.map(stat => (
          <div key={stat.label} className={s.compactaItem}>
            <span className={`${s.punto} ${s[stat.punto]}`} aria-hidden="true" />
            <span
              className={`text-label-md ${s.compactaValor} ${stat.punto === 'puntoTotales' ? s.compactaTotal : ''}`}
            >
              {loading ? '...' : stat.valor}
            </span>
            <span className={`text-label-md ${s.compactaLabel}`}>{stat.label}</span>
          </div>
        ))}
      </div>
    )
  }

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
