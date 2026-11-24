import { useRef } from 'react'
import { Button, Modal } from 'react-bootstrap'
import { QRCodeCanvas } from 'qrcode.react'
import logo from '../../assets/logo/gastroapp-logo-256x256.png'
import { cargarImagen, descargarImagen, dibujarAficheQr } from '../../utils/descargas'
import { destinoQrMesa, tituloMesa } from '../../utils/qrMesa'
import { AficheMesaQr } from './AficheMesaQr'
import type { MesaConCodigo } from '../../types/Mesa'

interface QrMesaModalProps {
  // Mesa a mostrar (null = modal oculto). Sólo se usan id y código, así
  // lo pueden pasar el alta y los detalles de mozo/gerente.
  mesa: Pick<MesaConCodigo, 'id' | 'codigo_acceso'> | null
  // Cierre simple (vistas de detalle): sin botones de alta.
  onCerrar?: () => void
  // "Listo": cierra el modal y vuelve a la lista de mesas (alta).
  onListo?: () => void
  // "Crear más": cierra el modal y resetea el formulario de alta.
  onCrearMas?: () => void
}

// QR de la visita (staff): codifica `${origin}/mesa?codigo={codigo_acceso}`
// y se exporta como afiche PNG. El afiche visible es `AficheMesaQr`, el
// mismo que usa el modal del comensal (QrMesaClienteModal).
export function QrMesaModal({ mesa, onCerrar, onListo, onCrearMas }: QrMesaModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const cerrar = onListo ?? onCerrar ?? (() => undefined)
  const destino = mesa ? destinoQrMesa(mesa.codigo_acceso) : ''

  // El PNG baja como afiche de la app (logo, QR enmarcado y el PIN en
  // bloque punteado) en vez del QR pelado — ver utils/descargas.ts.
  async function handlerDescargar() {
    const lienzo = canvasRef.current
    if (!lienzo || !mesa) return

    const afiche = await dibujarAficheQr({
      logo: await cargarImagen(logo),
      qr: lienzo,
      titulo: tituloMesa(mesa.id),
      subtitulo: 'Escaneá para entrar a tu mesa',
      codigo: { etiqueta: 'Código de tu mesa', valor: mesa.codigo_acceso },
      pie: 'Válido hasta cerrar la visita. También podés tipear el código en la app.',
    })
    descargarImagen(afiche, `qr-mesa-${mesa.id}.png`)
  }

  return (
    <Modal show={mesa !== null} onHide={cerrar} centered aria-labelledby='qr-mesa-titulo'>
      <Modal.Header closeButton className='no-print'>
        <Modal.Title id='qr-mesa-titulo' className='text-headline-sm'>
          QR de la mesa
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {mesa && <AficheMesaQr mesa={mesa} />}
      </Modal.Body>

      <Modal.Footer className='no-print'>
        <Button
          variant='outline-primary'
          className='text-label-md'
          type='button'
          onClick={handlerDescargar}
        >
          <i className='bi bi-download me-1' aria-hidden='true' />
          Descargar PNG
        </Button>
        <Button variant='outline-primary' className='text-label-md' type='button' onClick={onCrearMas}>
          <i className='bi bi-plus-circle me-1' aria-hidden='true' />
          Crear más
        </Button>
        <Button variant='primary' className='text-label-md' type='button' onClick={onListo}>
          Listo
        </Button>
      </Modal.Footer>

      {/* Lienzo fuera de pantalla para exportar el PNG en alta. */}
      <div className='no-print' style={{ position: 'fixed', left: -99999, top: 0 }} aria-hidden='true'>
        {mesa && <QRCodeCanvas ref={canvasRef} value={destino} size={1024} level='M' />}
      </div>
    </Modal>
  )
}
