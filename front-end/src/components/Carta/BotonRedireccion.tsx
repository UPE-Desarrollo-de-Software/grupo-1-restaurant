import { Link } from 'react-router-dom'
import s from './BotonRedireccion.module.css'

interface BotonRedireccionProps{
  nombre: string,
  ruta: string
}

export function BotonRedireccion({nombre, ruta}: BotonRedireccionProps) {
  return (
    <Link to={ruta}  className={s.boton}>
      <i className={`bi bi-plus-circle ${s.icono}`} aria-hidden="true" />
      <span className='text-label-lg'>{nombre}</span>
    </Link>
  )
}