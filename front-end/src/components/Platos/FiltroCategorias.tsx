import { Form } from 'react-bootstrap'
import type { Categoria, PlatoListar } from '../../types/Menu'
import type { FiltroCategoriaPlatos, FiltroEstadoPlatos } from './filtroPlatos'
import { opcionesCategoriaPlatos, opcionesEstadoPlatos } from './filtroPlatos'
import s from './FiltroCategorias.module.css'

interface FiltroCategoriasProps {
  platos: PlatoListar[]
  categorias: Categoria[]
  filtroCategoria: FiltroCategoriaPlatos
  filtroEstado: FiltroEstadoPlatos
  onFiltroCategoria: (filtro: FiltroCategoriaPlatos) => void
  onFiltroEstado: (filtro: FiltroEstadoPlatos) => void
}

export function FiltroCategorias({
  platos,
  categorias,
  filtroCategoria,
  filtroEstado,
  onFiltroCategoria,
  onFiltroEstado,
}: FiltroCategoriasProps) {
  const categoriasOpciones = opcionesCategoriaPlatos(platos, categorias)
  const estadosOpciones = opcionesEstadoPlatos(platos)

  return (
    <div className={s.filtros}>
      <Form.Select
        className={`${s.select} text-label-md`}
        value={filtroCategoria}
        onChange={e => onFiltroCategoria(e.target.value as FiltroCategoriaPlatos)}
        aria-label='Filtrar por categoría'
      >
        {categoriasOpciones.map(opcion => (
          <option key={opcion.clave} value={opcion.clave}>
            {opcion.etiqueta} {opcion.cantidad}
          </option>
        ))}
      </Form.Select>
      <Form.Select
        className={`${s.select} text-label-md`}
        value={filtroEstado}
        onChange={e => onFiltroEstado(e.target.value as FiltroEstadoPlatos)}
        aria-label='Filtrar por estado'
      >
        {estadosOpciones.map(opcion => (
          <option key={opcion.clave} value={opcion.clave}>
            {opcion.etiqueta} {opcion.cantidad}
          </option>
        ))}
      </Form.Select>
    </div>
  )
}
