import { useState } from 'react'
import { Alert, Button, Modal, Spinner } from 'react-bootstrap'
import { cerrarMesa } from '../../api/mesas'

interface CerrarMesaModalProps {
  visible: boolean
  mesaId: number
  numeroMesa: number
  onCancelar: () => void
  // Se emite al confirmar "Listo" tras el cierre exitoso, con el mensaje
  // para el caller (navegación con aviso al hub).
  onCerrada: (aviso: string) => void
}

// Fin de la VISITA de UNA mesa: el cliente pagó y el mozo/gestor cierra
// (POST /mesas/{id}/cerrar → borrado lógico; el PIN deja de valer y se
// cancelan reservas pendientes). Exige cero pedidos activos: el 422 del
// backend se muestra tal cual. Se abre desde EditarMesa (gerente) y
// MozoMesa (vista Cuenta).
export function CerrarMesaModal({ visible, mesaId, numeroMesa, onCancelar, onCerrada }: CerrarMesaModalProps) {
  const [enviando, setEnviando] = useState(false)
  const [errorApi, setErrorApi] = useState<string | null>(null)
  const [exito, setExito] = useState<string | null>(null)

  function cancelar() {
    setErrorApi(null)
    setExito(null)
    onCancelar()
  }

  function confirmarListo() {
    const aviso = exito ?? 'Mesa cerrada: fin de la visita'
    setExito(null)
    setErrorApi(null)
    onCerrada(aviso)
  }

  async function handlerCerrar() {
    setEnviando(true)
    setErrorApi(null)
    try {
      const { reservas_canceladas } = await cerrarMesa(mesaId)
      setExito(reservas_canceladas > 0
        ? `Mesa ${String(numeroMesa).padStart(2, '0')} cerrada: fin de la visita. Se cancelaron ${reservas_canceladas} reservas pendientes.`
        : `Mesa ${String(numeroMesa).padStart(2, '0')} cerrada: fin de la visita (cliente pagó).`)
    } catch (err) {
      setErrorApi(err instanceof Error ? err.message : 'No se pudo cerrar la mesa')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Modal show={visible} onHide={cancelar} centered aria-labelledby='cerrar-mesa-titulo'>
      <Modal.Header closeButton>
        <Modal.Title id='cerrar-mesa-titulo' className='text-headline-sm'>
          {exito ? 'Mesa cerrada' : 'Cerrar visita'}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {errorApi && <Alert variant='danger' className='text-body-md'>{errorApi}</Alert>}

        {exito ? (
          <Alert variant='success' className='text-body-md mb-0'>{exito}</Alert>
        ) : (
          <p className='text-body-md mb-0'>
            Cerrá la visita de la mesa {String(numeroMesa).padStart(2, '0')} cuando el cliente ya
            pagó: se elimina del sistema (su código deja de valer) y se cancelan sus reservas
            pendientes. No puede haber pedidos activos.
          </p>
        )}
      </Modal.Body>

      <Modal.Footer>
        {exito ? (
          <Button variant='primary' className='text-label-md' type='button' onClick={confirmarListo}>
            Listo
          </Button>
        ) : (
          <>
            <Button variant='outline-secondary' className='text-label-md' type='button' onClick={cancelar} disabled={enviando}>
              Cancelar
            </Button>
            <Button
              variant='primary'
              className='text-label-md'
              type='button'
              onClick={handlerCerrar}
              disabled={enviando}
            >
              {enviando
                ? <><Spinner size='sm' animation='border' className='me-2' />Cerrando...</>
                : 'Cerrar visita'}
            </Button>
          </>
        )}
      </Modal.Footer>
    </Modal>
  )
}
