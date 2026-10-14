import { Link } from 'react-router-dom'
import s from './BotonNuevoPlato.module.css'

export function BotonNuevoPlato() {
  return (
    <Link to='/gerente/carta/productos/crear' className={s.boton}>
      <i className={`bi bi-plus-circle ${s.icono}`} aria-hidden="true" />
      <span className='text-label-lg'>Nuevo Plato</span>
    </Link>
  )
}
