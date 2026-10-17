import { Button, Spinner } from 'react-bootstrap'
import s from './ZonaPeligro.module.css'

interface ZonaPeligroProps {
  titulo?: string
  descripcion: string
  textoBoton: string
  onEliminar: () => void
  eliminando?: boolean
}

export function ZonaPeligro({
  titulo = 'Zona de Peligro',
  descripcion,
  textoBoton,
  onEliminar,
  eliminando = false,
}: ZonaPeligroProps) {
  return (
    <section className={s.zona} aria-labelledby='zona-peligro-titulo'>
      <div className={s.encabezado}>
        <span className={s.icono} aria-hidden='true'>
          <i className='bi bi-exclamation-triangle-fill' />
        </span>
        <h2 id='zona-peligro-titulo' className={`text-headline-sm ${s.titulo}`}>
          {titulo}
        </h2>
      </div>

      <p className={`text-body-sm ${s.descripcion}`}>{descripcion}</p>

      <div className={s.pie}>
        <Button
          className={`text-label-md ${s.boton}`}
          variant='danger'
          type='button'
          disabled={eliminando}
          onClick={onEliminar}
        >
          {eliminando
            ? <><Spinner size='sm' animation='border' className='me-2' />Eliminando...</>
            : <><i className={`bi bi-trash3 ${s.iconoBoton}`} aria-hidden='true' /> {textoBoton}</>}
        </Button>
      </div>
    </section>
  )
}
