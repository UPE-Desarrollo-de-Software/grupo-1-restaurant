import type { Categoria, PlatoListar } from '../../types/Menu'
import type { FiltroPlatos } from './filtroPlatos'
import { chipsFiltroPlatos } from './filtroPlatos'
import s from './FiltroCategorias.module.css'

interface FiltroCategoriasProps {
  platos: PlatoListar[]
  categorias: Categoria[]
  filtro: FiltroPlatos
  onFiltro: (filtro: FiltroPlatos) => void
}

export function FiltroCategorias({ platos, categorias, filtro, onFiltro }: FiltroCategoriasProps) {
  const chips = chipsFiltroPlatos(platos, categorias)

  return (
    <div className={s.wrapper}>
      {chips.map(chip => (
        <button
          key={chip.clave}
          type='button'
          className={`${s.chip} ${filtro === chip.clave ? s.chipActivo : ''} text-label-md`}
          onClick={() => onFiltro(chip.clave)}
        >
          {chip.etiqueta} {chip.cantidad}
        </button>
      ))}
    </div>
  )
}
