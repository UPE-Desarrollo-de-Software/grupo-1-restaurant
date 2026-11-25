import { Link } from 'react-router-dom'
import s from './BotonRedireccion.module.css'

interface BotonRedireccionProps{
  nombre: string,
  ruta: string,
  // 'primario' (default) = relleno con el color primario, como en el resto de
  // los hubs. 'outline' = contorno, para la acción secundaria (Diseño 2.0).
  variante?: 'primario' | 'outline',
  // Clase de bootstrap-icons del botón; por defecto el "+" del alta.
  icono?: string,
}

export function BotonRedireccion({
  nombre,
  ruta,
  variante = 'primario',
  icono = 'bi bi-plus-circle',
}: BotonRedireccionProps) {
  return (
    <Link to={ruta}  className={variante === 'outline' ? `${s.boton} ${s.outline}` : s.boton}>
      <i className={`${icono} ${s.icono}`} aria-hidden="true" />
      <span className='text-label-lg'>{nombre}</span>
    </Link>
  )
}
