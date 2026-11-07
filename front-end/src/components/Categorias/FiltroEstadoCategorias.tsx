import type { Categoria } from '../../types/Menu'
import type { FiltroEstadoCategoria } from './filtroCategorias'
import { chipsEstadoCategorias } from './filtroCategorias'
import s from '../Platos/FiltroCategorias.module.css'

interface FiltroEstadoCategoriasProps {
  categorias: Categoria[]
  filtro: FiltroEstadoCategoria
  onFiltro: (filtro: FiltroEstadoCategoria) => void
}

export function FiltroEstadoCategorias({ categorias, filtro, onFiltro }: FiltroEstadoCategoriasProps) {
  const chips = chipsEstadoCategorias(categorias)

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
