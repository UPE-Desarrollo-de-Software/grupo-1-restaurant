import { useRef } from 'react'
import { Button, Modal } from 'react-bootstrap'
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react'
import logo from '../../assets/logo/gastroapp-logo-256x256.png'
import type { MesaConCodigo } from '../../types/Mesa'
import s from './QrMesaModal.module.css'

interface QrMesaModalProps {
  // Mesa recién creada (null = modal oculto).
  mesa: MesaConCodigo | null
  onCerrar: () => void
}

// QR de la visita: codifica `${origin}/mesa?codigo={codigo_acceso}`, así
// el cliente escanea y queda identificado sin tipear el PIN. El código
// es la credencial: muere con la mesa (borrado lógico al cerrar visita).
export function QrMesaModal({ mesa, onCerrar }: QrMesaModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const destino = mesa
    ? `${window.location.origin}/mesa?codigo=${mesa.codigo_acceso}`
    : ''

  function handlerDescargar() {
    const lienzo = canvasRef.current?.toDataURL('image/png')
    if (!lienzo) return
    const enlace = document.createElement('a')
    enlace.href = lienzo
    enlace.download = `qr-mesa-${mesa?.id ?? 'mesa'}.png`
    enlace.click()
  }

  return (
    <Modal show={mesa !== null} onHide={onCerrar} centered aria-labelledby='qr-mesa-titulo'>
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
            <p className={`text-headline-md ${s.codigo}`}>{mesa.codigo_acceso}</p>
            <p className={`text-body-sm ${s.ayuda}`}>
              O ingresá el código de 4 dígitos en la app.
            </p>
            <p className={`text-body-sm ${s.url}`}>{destino}</p>
            <p className={`text-body-sm ${s.nota}`}>
              <i className='bi bi-info-circle me-1' aria-hidden='true' />
              Válido hasta cerrar la visita.
            </p>
          </div>
        )}
      </Modal.Body>

      <Modal.Footer className='no-print'>
        <Button variant='outline-primary' className='text-label-md' type='button' onClick={() => window.print()}>
          <i className='bi bi-printer me-1' aria-hidden='true' />
          Imprimir
        </Button>
        <Button variant='outline-primary' className='text-label-md' type='button' onClick={handlerDescargar}>
          <i className='bi bi-download me-1' aria-hidden='true' />
          Descargar PNG
        </Button>
        <Button variant='primary' className='text-label-md' type='button' onClick={onCerrar}>
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
