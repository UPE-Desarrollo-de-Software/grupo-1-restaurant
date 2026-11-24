import type { PlatoListar } from '../../types/Menu'
import s from './MenuList.module.css'
import { PlatoCard } from './PlatoCard'
import GastroLoader from '../GastroLoader/GastroLoader'

interface MenuListProps {
  platos: PlatoListar[]
  loading: boolean
  error: string | null
  // Texto del buscador: cambia el mensaje cuando el filtro no devuelve nada.
  busqueda?: string
}

// Lista de la carta: recibe los platos ya filtrados (el fetch y los
// controles viven en la página) y sólo se ocupa del estado y las tarjetas.
export function MenuList({ platos, loading, error, busqueda }: MenuListProps) {
  if (loading) {
    return (
      <div className='d-flex justify-content-center py-5'>
        <GastroLoader />
      </div>
    )
  }

  if (error) {
    return <p className='text-body-md text-center'>{error}</p>
  }

  if (platos.length === 0) {
    const consulta = (busqueda ?? '').trim()
    return (
      <p className='text-body-md text-center'>
        {consulta
          ? `Sin resultados para «${consulta}»`
          : 'No hay platos cargados todavía'}
      </p>
    )
  }

  return (
    <ul className={s.list}>
      {platos.map(p => (
        <li key={p.id}>
          <PlatoCard plato={p} />
        </li>
      ))}
    </ul>
  )
}
