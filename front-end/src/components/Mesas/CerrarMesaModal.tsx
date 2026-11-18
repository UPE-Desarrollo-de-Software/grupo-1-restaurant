import { useEffect, useState } from 'react'
import { Alert, Button, Form, Modal, Spinner } from 'react-bootstrap'
import { cerrarMesa, cobrarEfectivo, getCuentaMesa } from '../../api/mesas'
import { formatearPrecio } from '../../utils/historial'

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
// cancelan reservas pendientes). Exige CERO pedidos activos Y cuenta
// SALDADA: si queda saldo, el modal cobra en efectivo primero
// (POST /mesas/{id}/pagos con el saldo precargado y editable) y recién
// ahí cierra. Los 422 del backend se muestran tal cual. Se abre desde
// EditarMesa (gerente) y MozoMesa (vista Cuenta).
export function CerrarMesaModal({ visible, mesaId, numeroMesa, onCancelar, onCerrada }: CerrarMesaModalProps) {
  const [enviando, setEnviando] = useState(false)
  const [errorApi, setErrorApi] = useState<string | null>(null)
  const [exito, setExito] = useState<string | null>(null)
  // Saldo pendiente de la visita (null = aún sin cargar): sirve para
  // precargar el cobro en efectivo; la fuente de verdad sigue en el back.
  const [saldo, setSaldo] = useState<number | null>(null)
  const [errorSaldo, setErrorSaldo] = useState<string | null>(null)
  const [monto, setMonto] = useState('')

  // Al abrir: trae la cuenta para precargar el monto con el saldo
  // pendiente (editable). Los sets van siempre en callbacks (regla
  // set-state-in-effect).
  useEffect(() => {
    if (!visible) return
    const controller = new AbortController()
    let cancelado = false

    getCuentaMesa(mesaId, controller.signal)
      .then(cuenta => {
        if (cancelado) return
        const pendiente = Number(cuenta.saldo?.pendiente ?? 0)
        setSaldo(pendiente)
        setMonto(pendiente > 0 ? pendiente.toFixed(2) : '')
        setErrorSaldo(null)
      })
      .catch(err => {
        if (cancelado || (err instanceof DOMException && err.name === 'AbortError')) return
        setSaldo(null)
        setErrorSaldo(err instanceof Error ? err.message : 'No se pudo cargar el saldo de la cuenta')
      })

    return () => {
      cancelado = true
      controller.abort()
    }
  }, [visible, mesaId])

  function cancelar() {
    setErrorApi(null)
    setExito(null)
    setSaldo(null)
    setErrorSaldo(null)
    setMonto('')
    onCancelar()
  }

  function confirmarListo() {
    const aviso = exito ?? 'Mesa cerrada: fin de la visita'
    setExito(null)
    setErrorApi(null)
    onCerrada(aviso)
  }

  async function handlerCerrar() {
    const pendiente = saldo ?? 0
    const hayQueCobrar = pendiente > 0.01

    if (hayQueCobrar) {
      const montoCobrado = Number(monto)
      if (!Number.isFinite(montoCobrado) || montoCobrado <= 0) {
        setErrorApi('Ingresá el monto cobrado en efectivo.')
        return
      }
      if (montoCobrado > pendiente + 0.01) {
        setErrorApi('El monto no puede superar el saldo pendiente de la cuenta.')
        return
      }
    }

    setEnviando(true)
    setErrorApi(null)
    try {
      if (hayQueCobrar) {
        await cobrarEfectivo(mesaId, Number(monto))
      }
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

  const cargandoSaldo = visible && saldo === null && errorSaldo === null && !exito

  return (
    <Modal show={visible} onHide={cancelar} centered aria-labelledby='cerrar-mesa-titulo'>
      <Modal.Header closeButton>
        <Modal.Title id='cerrar-mesa-titulo' className='text-headline-sm'>
          {exito ? 'Mesa cerrada' : 'Cerrar visita'}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {errorApi && <Alert variant='danger' className='text-body-md'>{errorApi}</Alert>}
        {errorSaldo && <Alert variant='warning' className='text-body-md'>{errorSaldo}</Alert>}

        {exito ? (
          <Alert variant='success' className='text-body-md mb-0'>{exito}</Alert>
        ) : (
          <>
            <p className='text-body-md'>
              ¿Cerrar visita de la Mesa {String(numeroMesa).padStart(2, '0')}?
            </p>

            {cargandoSaldo && (
              <p className='text-body-sm d-flex align-items-center gap-2 mb-0'>
                <Spinner size='sm' animation='border' /> Cargando saldo de la cuenta…
              </p>
            )}

            {saldo !== null && saldo > 0.01 && (
              <Form.Group controlId='cobro-efectivo' className='mt-2'>
                <Form.Label className='text-label-md'>
                  Saldo pendiente: {formatearPrecio(saldo)}
                </Form.Label>
                <Form.Control
                  type='number'
                  min={0.01}
                  step={0.01}
                  inputMode='decimal'
                  value={monto}
                  onChange={e => setMonto(e.target.value)}
                  disabled={enviando}
                />
                <Form.Text className='text-body-sm'>
                  Cobrá la cuenta en efectivo antes de cerrar. Ajustá el monto si cobraste
                  distinto del saldo.
                </Form.Text>
              </Form.Group>
            )}
          </>
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
              disabled={enviando || cargandoSaldo}
            >
              {enviando
                ? <><Spinner size='sm' animation='border' className='me-2' />Guardando...</>
                : (saldo !== null && saldo > 0.01) ? 'Cobrar y cerrar' : 'Cerrar visita'}
            </Button>
          </>
        )}
      </Modal.Footer>
    </Modal>
  )
}
