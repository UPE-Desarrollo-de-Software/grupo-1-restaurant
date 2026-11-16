import { QRCodeSVG } from 'qrcode.react'
import logo from '../../assets/logo/gastroapp-logo-256x256.png'
import { destinoQrMesa, tituloMesa } from '../../utils/qrMesa'
import type { MesaConCodigo } from '../../types/Mesa'
import s from './AficheMesaQr.module.css'

interface AficheMesaQrProps {
  // Sólo se usan id y código de la visita: lo comparten el alta, los
  // detalles del staff y el modal del cliente.
  mesa: Pick<MesaConCodigo, 'id' | 'codigo_acceso'>
}

// Afiche del QR de la visita (logo, número de mesa, QR y código). Es el
// mismo bloque visual en el modal del staff y en el del comensal; el
// primero además lo exporta como PNG (ver QrMesaModal).
export function AficheMesaQr({ mesa }: AficheMesaQrProps) {
  return (
    <div className={s.afiche}>
      <img src={logo} alt='GastroApp' className={s.logo} />
      <h3 className={`text-headline-sm ${s.titulo}`}>{tituloMesa(mesa.id)}</h3>
      <p className={`text-body-sm ${s.subtitulo}`}>
        Escaneá para entrar a tu mesa
      </p>
      <QRCodeSVG
        value={destinoQrMesa(mesa.codigo_acceso)}
        size={220}
        level='M'
        className={s.qr}
      />
      <p className={`text-body-sm ${s.ayuda}`}>
        O ingresá el código de 4 dígitos en la app.
      </p>
      <p className={`text-headline-md ${s.codigo}`}>{mesa.codigo_acceso}</p>

      <p className={`text-body-sm ${s.nota}`}>
        <i className='bi bi-info-circle me-1' aria-hidden='true' />
        Válido hasta cerrar la visita.
      </p>
    </div>
  )
}
