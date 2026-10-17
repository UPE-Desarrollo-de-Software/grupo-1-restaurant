import { usePlatos } from '../../hooks/usePlatos'
import s from './MenuList.module.css'
import { PlatoCard } from './PlatoCard'

export function MenuList(){
  const {platos, loading, error} = usePlatos()

  if(loading){
    return <p className='text-body-md text-center'>Cargando platos...</p>
  }

  if(error){
    return <p className='text-body-md text-center'>{error}</p>
  }

  if(platos.length === 0){
    return <p className='text-body-md text-center'>No hay platos cargados todavía</p>
  }

  return(
    <ul className={s.list}>
      {platos.map(p => (
        <li key={p.id}>
          <PlatoCard plato={p}/>
        </li>
      ))}
    </ul>
  )
}