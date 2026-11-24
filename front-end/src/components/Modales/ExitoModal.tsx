import type { ReactNode } from 'react'
import { Button, Modal } from 'react-bootstrap'
import s from './Modales.module.css'

type DatoExito = { etiqueta: string; valor: string }

interface ExitoModalProps {
    // Modal de operación exitosa. "Listo" es la acción principal (en los ABM:
    // volver a la lista de la sección).
    show: boolean
    titulo: string
    mensaje: string
    // Filas etiqueta/valor con lo que se acaba de guardar (opcional).
    datos?: DatoExito[]
    // Botón secundario opcional ("Seguir creando", "Crear más"…). Si no se
    // pasa `onSeguir`, el modal muestra sólo el botón "Listo".
    textoSeguir?: string
    onSeguir?: () => void
    // Botón principal: "Listo" (en los ABM, volver a la lista).
    textoListo?: string
    onListo: () => void
    // Cierre con la X / Esc / click afuera. Por defecto: onSeguir ?? onListo.
    onCerrar?: () => void
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
    textoListo = 'Listo',
    onListo,
    onCerrar,
    children,
}: ExitoModalProps) {
    return (
        <Modal show={show} onHide={onCerrar ?? onSeguir ?? onListo} centered>
            <Modal.Header closeButton>
                <Modal.Title className='text-headline-sm'>{titulo}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <div className={`${s.icono} ${s.iconoExito}`} aria-hidden='true'>
                    <i className='bi bi-check2-circle' />
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
                {onSeguir && (
                    <Button
                        variant='outline-primary'
                        className='text-label-md'
                        type='button'
                        onClick={onSeguir}
                    >
                        <i className='bi bi-plus-circle me-1' aria-hidden='true' />
                        {textoSeguir}
                    </Button>
                )}
                <Button
                    type='button'
                    variant='primary'
                    className='text-label-md'
                    onClick={onListo}
                >
                    {textoListo}
                </Button>
            </Modal.Footer>
        </Modal>
    )
}
