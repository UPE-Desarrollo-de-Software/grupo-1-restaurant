import type { Categoria, PlatoListar } from '../../types/Menu'

// Los hub de platos filtran con dos controles independientes: categoría
// ('Todas' o una categoría activa) y estado ('Todos', 'Disponibles',
// 'Pausados'). Fuera de los componentes por
// react-refresh/only-export-components (se consume desde PlatosHub y
// FiltroCategorias).
export type FiltroCategoriaPlatos = 'todas' | `cat:${number}`
export type FiltroEstadoPlatos = 'todos' | 'disponibles' | 'pausados'

export interface OpcionFiltro {
  clave: string
  etiqueta: string
  cantidad: number
}

export function opcionesCategoriaPlatos(
  platos: PlatoListar[],
  categorias: Categoria[],
): OpcionFiltro[] {
  const activas = categorias.filter(categoria => categoria.activo)
  return [
    { clave: 'todas', etiqueta: 'Todas', cantidad: platos.length },
    ...activas.map(categoria => ({
      clave: `cat:${categoria.id}`,
      etiqueta: categoria.nombre,
      cantidad: platos.filter(plato => plato.categoria_id === categoria.id).length,
    })),
  ]
}

export function opcionesEstadoPlatos(platos: PlatoListar[]): OpcionFiltro[] {
  return [
    { clave: 'todos', etiqueta: 'Todos', cantidad: platos.length },
    { clave: 'disponibles', etiqueta: 'Disponibles', cantidad: platos.filter(plato => plato.disponible).length },
    { clave: 'pausados', etiqueta: 'Pausados', cantidad: platos.filter(plato => !plato.disponible).length },
  ]
}

export function aplicarFiltroPlatos(
  platos: PlatoListar[],
  filtroCategoria: FiltroCategoriaPlatos,
  filtroEstado: FiltroEstadoPlatos,
): PlatoListar[] {
  let resultado = platos

  if (filtroEstado === 'disponibles') resultado = resultado.filter(plato => plato.disponible)
  if (filtroEstado === 'pausados') resultado = resultado.filter(plato => !plato.disponible)

  if (filtroCategoria !== 'todas') {
    const categoriaId = Number(filtroCategoria.slice('cat:'.length))
    resultado = resultado.filter(plato => plato.categoria_id === categoriaId)
  }

  return resultado
}
