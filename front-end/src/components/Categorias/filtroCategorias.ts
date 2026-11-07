import type { Categoria } from '../../types/Menu'

// Chips del hub de categorías: Todas / Activas / Inactivas. Fuera de los
// componentes por react-refresh/only-export-components (se consume desde
// CategoriasHub y FiltroEstadoCategorias).
export type FiltroEstadoCategoria = 'todas' | 'activas' | 'inactivas'

export interface ChipEstado {
  clave: FiltroEstadoCategoria
  etiqueta: string
  cantidad: number
}

export function chipsEstadoCategorias(categorias: Categoria[]): ChipEstado[] {
  const activas = categorias.filter(categoria => categoria.activo)
  return [
    { clave: 'todas', etiqueta: 'Todas', cantidad: categorias.length },
    { clave: 'activas', etiqueta: 'Activas', cantidad: activas.length },
    { clave: 'inactivas', etiqueta: 'Inactivas', cantidad: categorias.length - activas.length },
  ]
}

export function aplicarFiltroEstadoCategorias(
  categorias: Categoria[],
  filtro: FiltroEstadoCategoria,
): Categoria[] {
  if (filtro === 'activas') return categorias.filter(categoria => categoria.activo)
  if (filtro === 'inactivas') return categorias.filter(categoria => !categoria.activo)
  return categorias
}
