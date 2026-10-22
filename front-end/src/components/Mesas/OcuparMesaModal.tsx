import { useState } from 'react'
import { Alert, Button, Form, Modal, Spinner } from 'react-bootstrap'
import type { Mesa } from '../../types/Mesa'
import { ocuparMesa } from '../../api/mesas'

interface OcuparMesaModalProps {
  visible: boolean
  mesas: Mesa[]
  onCerrar: () => void
  onCambio: () => void
}

const ETIQUETAS_ESTADO: Record<string, string> = {
  libre: 'Libre',
  ocupada: 'Ocupada',
  reservada: 'Reservada',
}

export function OcuparMesaModal({ visible, mesas, onCerrar, onCambio }: OcuparMesaModalProps) {
  const [seleccion, setSeleccion] = useState<number | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [errorApi, setErrorApi] = useState<string | null>(null)
  const [pin, setPin] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)
  const [falloCopia, setFalloCopia] = useState(false)

  const disponibles = mesas.filter(mesa => mesa.estado !== 'ocupada')

  function cerrar() {
    setSeleccion(null)
    setErrorApi(null)
    setPin(null)
    setCopiado(false)
    setFalloCopia(false)
    onCerrar()
  }

  async function handlerOcupar() {
    if (seleccion === null) return
    setEnviando(true)
    setErrorApi(null)
    try {
      const { codigo_acceso } = await ocuparMesa(seleccion)
      setPin(codigo_acceso)
      onCambio()
    } catch (err) {
      setErrorApi(err instanceof Error ? err.message : 'No se pudo ocupar la mesa')
    } finally {
      setEnviando(false)
    }
  }

  async function handlerCopiar() {
    if (!pin) return
    try {
      await navigator.clipboard.writeText(pin)
      setCopiado(true)
      setFalloCopia(false)
    } catch {
      setCopiado(false)
      setFalloCopia(true)
    }
  }

  return (
    <Modal show={visible} onHide={cerrar} centered aria-labelledby='ocupar-mesa-titulo'>
      <Modal.Header closeButton>
        <Modal.Title id='ocupar-mesa-titulo' className='text-headline-sm'>
          {pin ? 'Mesa ocupada' : 'Ocupar mesa'}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {errorApi && <Alert variant='danger' className='text-body-md'>{errorApi}</Alert>}

        {pin ? (
          <div className='text-center'>
            <p className='text-body-md mb-2'>
              Pasale este código al cliente para que cargue su pedido:
            </p>
            <p className='text-headline-lg mb-3' style={{ letterSpacing: '0.3em' }}>{pin}</p>
            <Button
              variant={copiado ? 'success' : 'outline-primary'}
              size='sm'
              className='text-label-md'
              type='button'
              onClick={handlerCopiar}
            >
              <i className={`bi ${copiado ? 'bi-check2' : 'bi-clipboard'} me-1`} aria-hidden='true' />
              {copiado ? 'Código copiado' : 'Copiar código'}
            </Button>
            {falloCopia && (
              <p className='text-body-sm text-danger mt-2 mb-0'>
                No se pudo copiar automáticamente: copialo a mano.
              </p>
            )}
          </div>
        ) : disponibles.length === 0 ? (
          <p className='text-body-md text-center mb-0'>Todas las mesas están ocupadas.</p>
        ) : (
          <div className='d-flex flex-column gap-2'>
            <p className='text-body-sm text-muted mb-1'>
              Elegí la mesa que pasa a estar ocupada. El código de acceso no cambia.
            </p>
            {disponibles.map(mesa => (
              <Form.Check
                key={mesa.id}
                type='radio'
                id={`ocupar-mesa-${mesa.id}`}
                name='ocupar-mesa'
                className='text-body-md'
                label={
                  `Mesa #${String(mesa.id).padStart(2, '0')} · ${mesa.capacidad} lugares · ` +
                  (ETIQUETAS_ESTADO[mesa.estado] ?? mesa.estado)
                }
                checked={seleccion === mesa.id}
                onChange={() => setSeleccion(mesa.id)}
              />
            ))}
          </div>
        )}
      </Modal.Body>

      <Modal.Footer>
        {pin ? (
          <Button variant='primary' className='text-label-md' type='button' onClick={cerrar}>
            Listo
          </Button>
        ) : (
          <>
            <Button variant='outline-secondary' className='text-label-md' type='button' onClick={cerrar} disabled={enviando}>
              Cancelar
            </Button>
            <Button
              variant='primary'
              className='text-label-md'
              type='button'
              onClick={handlerOcupar}
              disabled={seleccion === null || enviando}
            >
              {enviando
                ? <><Spinner size='sm' animation='border' className='me-2' />Ocupando...</>
                : 'Ocupar mesa'}
            </Button>
          </>
        )}
      </Modal.Footer>
    </Modal>
  )
}
