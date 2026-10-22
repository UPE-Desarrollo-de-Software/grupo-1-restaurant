import { useRef } from 'react'
import { Button } from 'react-bootstrap'
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react'
import logo from '../../../../assets/logo/gastroapp-logo-256x256.png'
import s from './QrMesas.module.css'

// QR general del local: escanearlo abre la landing ("/"), que es la
// puerta de entrada del cliente (carta + conectar mesa con PIN).
// Se genera con el origin actual: imprimirlo desde el dominio real.

export function QrMesasPage() {
    const destino = window.location.origin
    const canvasRef = useRef<HTMLCanvasElement>(null)

    function handlerDescargar() {
        const lienzo = canvasRef.current?.toDataURL('image/png')
        if (!lienzo) return
        const enlace = document.createElement('a')
        enlace.href = lienzo
        enlace.download = 'qr-carta-gastroapp.png'
        enlace.click()
    }

    return (
        <div className={s.page}>
            <div className={s.afiche}>
                <img src={logo} alt='GastroApp' className={s.logo} />
                <h1 className={`text-headline-md ${s.titulo}`}>Escaneá para ver la carta</h1>
                <QRCodeSVG value={destino} size={280} level='M' className={s.qr} />
                <p className={`text-body-md ${s.url}`}>{destino}</p>
            </div>

            <div className={`${s.acciones} no-print`}>
                <Button
                    variant='primary'
                    className='text-label-md'
                    type='button'
                    onClick={() => window.print()}
                >
                    <i className='bi bi-printer me-1' aria-hidden='true' />
                    Imprimir
                </Button>
                <Button
                    variant='outline-primary'
                    className='text-label-md'
                    type='button'
                    onClick={handlerDescargar}
                >
                    <i className='bi bi-download me-1' aria-hidden='true' />
                    Descargar PNG
                </Button>
            </div>

            {/* Lienzo fuera de pantalla para exportar el PNG en alta. */}
            <div className='no-print' style={{ position: 'fixed', left: -99999, top: 0 }} aria-hidden='true'>
                <QRCodeCanvas ref={canvasRef} value={destino} size={1024} level='M' />
            </div>
        </div>
    )
}
