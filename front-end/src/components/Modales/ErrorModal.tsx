import type { ReactNode } from 'react'
import { Button, Modal } from 'react-bootstrap'
import s from './Modales.module.css'

type DatoError = { etiqueta: string; valor: string }

interface ErrorModalProps {
    // Modal de error de una acción. "Aceptar" sólo cierra el modal: el
    // usuario sigue en la misma pantalla con el formulario intacto para
    // corregir y reintentar (no navega).
    show: boolean
    titulo?: string
    mensaje: string
    // Detalle opcional debajo del mensaje (filas etiqueta/valor).
    datos?: DatoError[]
    textoBoton?: string
    onAceptar: () => void
    children?: ReactNode
}

export function ErrorModal({
    show,
    titulo = 'No se pudo completar la operación',
    mensaje,
    datos = [],
    textoBoton = 'Aceptar',
    onAceptar,
    children,
}: ErrorModalProps) {
    return (
        <Modal show={show} onHide={onAceptar} centered>
            <Modal.Header closeButton>
                <Modal.Title className='text-headline-sm'>{titulo}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <div className={`${s.icono} ${s.iconoError}`} aria-hidden='true'>
                    <i className='bi bi-exclamation-triangle-fill' />
                </div>
                <p className={`text-body-md ${s.texto}`}>{mensaje}</p>

                {datos.length > 0 && (
                    <ul className={s.datos}>
                        {datos.map(dato => (
                            <li className='text-body-sm' key={dato.etiqueta}>
                                <span>{dato.etiqueta}</span>
                                <strong>{dato.valor}</strong>
                            </li>
                        ))}
                    </ul>
                )}

                {children}
            </Modal.Body>
            <Modal.Footer>
                <Button
                    type='button'
                    variant='primary'
                    className='text-label-md'
                    onClick={onAceptar}
                >
                    {textoBoton}
                </Button>
            </Modal.Footer>
        </Modal>
    )
}
