import type { Categoria, PlatoListar } from '../../types/Menu'

// Chips del hub de platos: 'Todas', una por categoría ACTIVA,
// 'Disponibles' y 'Pausados'. Fuera de los componentes por
// react-refresh/only-export-components (se consume desde PlatosHub y
// FiltroCategorias).
export type FiltroPlatos = 'todas' | `cat:${number}` | 'disponibles' | 'pausados'

export interface ChipFiltro {
  clave: FiltroPlatos
  etiqueta: string
  cantidad: number
}

export function chipsFiltroPlatos(platos: PlatoListar[], categorias: Categoria[]): ChipFiltro[] {
  const activas = categorias.filter(categoria => categoria.activo)
  return [
    { clave: 'todas', etiqueta: 'Todas', cantidad: platos.length },
    ...activas.map(categoria => ({
      clave: `cat:${categoria.id}` as const,
      etiqueta: categoria.nombre,
      cantidad: platos.filter(plato => plato.categoria_id === categoria.id).length,
    })),
    { clave: 'disponibles', etiqueta: 'Disponibles', cantidad: platos.filter(plato => plato.disponible).length },
    { clave: 'pausados', etiqueta: 'Pausados', cantidad: platos.filter(plato => !plato.disponible).length },
  ]
}

export function aplicarFiltroPlatos(platos: PlatoListar[], filtro: FiltroPlatos): PlatoListar[] {
  if (filtro === 'todas') return platos
  if (filtro === 'disponibles') return platos.filter(plato => plato.disponible)
  if (filtro === 'pausados') return platos.filter(plato => !plato.disponible)

  const categoriaId = Number(filtro.slice('cat:'.length))
  return platos.filter(plato => plato.categoria_id === categoriaId)
}
