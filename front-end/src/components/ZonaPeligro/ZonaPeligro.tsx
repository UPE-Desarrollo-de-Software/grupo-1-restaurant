import { useState } from 'react'
import { Button, Modal, Spinner } from 'react-bootstrap'
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
  // Borrado en 2 pasos: el botón abre el modal; la acción recién se
  // ejecuta al confirmar ahí dentro. Aplica en todos los ABM.
  const [confirmando, setConfirmando] = useState(false)

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
          onClick={() => setConfirmando(true)}
        >
          <i className={`bi bi-trash3 ${s.iconoBoton}`} aria-hidden='true' /> {textoBoton}
        </Button>
      </div>

      <Modal
        show={confirmando}
        onHide={() => setConfirmando(false)}
        centered
        size='sm'
        aria-labelledby='confirmar-eliminar-titulo'
      >
        <Modal.Header closeButton>
          <Modal.Title id='confirmar-eliminar-titulo' className='text-headline-sm'>
            ¿{textoBoton}?
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className='text-body-sm'>
          {descripcion}
        </Modal.Body>
        <Modal.Footer>
          <Button
            className='text-label-md'
            variant='outline-secondary'
            type='button'
            disabled={eliminando}
            onClick={() => setConfirmando(false)}
          >
            Cancelar
          </Button>
          <Button
            className='text-label-md'
            variant='danger'
            type='button'
            disabled={eliminando}
            onClick={onEliminar}
          >
            {eliminando
              ? <><Spinner size='sm' animation='border' className='me-2' />Eliminando...</>
              : 'Confirmar'}
          </Button>
        </Modal.Footer>
      </Modal>
    </section>
  )
}
