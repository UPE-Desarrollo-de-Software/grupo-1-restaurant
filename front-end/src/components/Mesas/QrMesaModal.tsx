import { useRef } from 'react'
import { Button, Modal } from 'react-bootstrap'
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react'
import logo from '../../assets/logo/gastroapp-logo-256x256.png'
import { cargarImagen, descargarImagen, dibujarAficheQr } from '../../utils/descargas'
import type { MesaConCodigo } from '../../types/Mesa'
import s from './QrMesaModal.module.css'

interface QrMesaModalProps {
  // Mesa recién creada (null = modal oculto).
  mesa: MesaConCodigo | null
  // "Listo": cierra el modal y vuelve a la lista de mesas.
  onListo: () => void
  // "Crear más": cierra el modal y resetea el formulario de alta.
  onCrearMas: () => void
}

// QR de la visita: codifica `${origin}/mesa?codigo={codigo_acceso}`, así
// el cliente escanea y queda identificado sin tipear el PIN. El código
// es la credencial: muere con la mesa (borrado lógico al cerrar visita).
export function QrMesaModal({ mesa, onListo, onCrearMas }: QrMesaModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const destino = mesa
    ? `${window.location.origin}/mesa?codigo=${mesa.codigo_acceso}`
    : ''

  // El PNG baja como afiche de la app (logo, QR enmarcado y el PIN en
  // bloque punteado) en vez del QR pelado — ver utils/descargas.ts.
  async function handlerDescargar() {
    const lienzo = canvasRef.current
    if (!lienzo || !mesa) return

    const afiche = await dibujarAficheQr({
      logo: await cargarImagen(logo),
      qr: lienzo,
      titulo: `Mesa #${String(mesa.id).padStart(2, '0')}`,
      subtitulo: 'Escaneá para entrar a tu mesa',
      codigo: { etiqueta: 'Código de tu mesa', valor: mesa.codigo_acceso },
      pie: 'Válido hasta cerrar la visita. También podés tipear el código en la app.',
    })
    descargarImagen(afiche, `qr-mesa-${mesa.id}.png`)
  }

  return (
    <Modal show={mesa !== null} onHide={onListo} centered aria-labelledby='qr-mesa-titulo'>
      <Modal.Header closeButton className='no-print'>
        <Modal.Title id='qr-mesa-titulo' className='text-headline-sm'>
          QR de la mesa
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {mesa && (
          <div className={s.afiche}>
            <img src={logo} alt='GastroApp' className={s.logo} />
            <h3 className={`text-headline-sm ${s.titulo}`}>
              Mesa #{String(mesa.id).padStart(2, '0')}
            </h3>
            <p className={`text-body-sm ${s.subtitulo}`}>
              Escaneá para entrar a tu mesa
            </p>
            <QRCodeSVG value={destino} size={220} level='M' className={s.qr} />
            <p className={`text-body-sm ${s.ayuda}`}>
              O ingresá el código de 4 dígitos en la app.
            </p>
            <p className={`text-headline-md ${s.codigo}`}>{mesa.codigo_acceso}</p>

            <p className={`text-body-sm ${s.nota}`}>
              <i className='bi bi-info-circle me-1' aria-hidden='true' />
              Válido hasta cerrar la visita.
            </p>
          </div>
        )}
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
