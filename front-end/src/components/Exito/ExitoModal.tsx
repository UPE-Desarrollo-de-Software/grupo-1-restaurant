import type { ReactNode } from 'react'
import { Button, Modal } from 'react-bootstrap'
import s from './ExitoModal.module.css'

type DatoExito = { etiqueta: string; valor: string }

interface ExitoModalProps {
    // Modal de confirmación de un alta: "Listo" vuelve a la lista de la
    // sección y "Seguir creando" (o "Crear más") cierra y deja el
    // formulario limpio para cargar otro registro.
    show: boolean
    titulo: string
    mensaje: string
    // Filas etiqueta/valor con lo que se acaba de crear (opcional).
    datos?: DatoExito[]
    textoSeguir?: string
    onSeguir: () => void
    onListo: () => void
    // Contenido extra debajo de los datos (el PIN de la reserva).
    children?: ReactNode
}

export function ExitoModal({
    show,
    titulo,
    mensaje,
    datos = [],
    textoSeguir = 'Seguir creando',
    onSeguir,
    onListo,
    children,
}: ExitoModalProps) {
    return (
        <Modal show={show} onHide={onSeguir} centered>
            <Modal.Header closeButton>
                <Modal.Title className='text-headline-sm'>{titulo}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <div className={s.exitoIcono} aria-hidden='true'>
                    <i className='bi bi-check2-circle' />
                </div>
                <p className={`text-body-md ${s.exitoTexto}`}>{mensaje}</p>

                {datos.length > 0 && (
                    <ul className={s.exitoDatos}>
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
                    variant='outline-primary'
                    className='text-label-md'
                    type='button'
                    onClick={onSeguir}
                >
                    <i className='bi bi-plus-circle me-1' aria-hidden='true' />
                    {textoSeguir}
                </Button>
                <Button
                    type='button'
                    variant='primary'
                    className='text-label-md'
                    onClick={onListo}
                >
                    Listo
                </Button>
            </Modal.Footer>
        </Modal>
    )
}
