import type { ReactNode } from 'react'
import { Alert, Button, Modal, Spinner } from 'react-bootstrap'

// Confirmación genérica de la experiencia de cliente: se usa para
// "Cancelar pedido" (acción destructiva) y para "Enviar pedido"
// (con resumen + estado de carga + error de reintento).
interface ConfirmacionModalProps {
    show: boolean
    titulo: string
    children?: ReactNode
    textoConfirmar: string
    textoCancelar: string
    varianteConfirmar?: 'primary' | 'danger'
    confirmarCargando?: boolean
    error?: string | null
    onConfirmar: () => void
    onCancelar: () => void
}

export function ConfirmacionModal({
    show,
    titulo,
    children,
    textoConfirmar,
    textoCancelar,
    varianteConfirmar = 'primary',
    confirmarCargando = false,
    error,
    onConfirmar,
    onCancelar,
}: ConfirmacionModalProps) {
    return (
        <Modal show={show} onHide={onCancelar} centered>
            <Modal.Header closeButton>
                <Modal.Title className='text-headline-sm'>{titulo}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {children}
                {error && (
                    <Alert variant='danger' className='text-body-sm mb-0 mt-2' role='alert'>
                        {error}
                    </Alert>
                )}
            </Modal.Body>
            <Modal.Footer>
                <Button
                    type='button'
                    variant='outline-secondary'
                    className='text-label-md'
                    onClick={onCancelar}
                    disabled={confirmarCargando}
                >
                    {textoCancelar}
                </Button>
                <Button
                    type='button'
                    variant={varianteConfirmar}
                    className='text-label-md'
                    onClick={onConfirmar}
                    disabled={confirmarCargando}
                >
                    {confirmarCargando
                        ? (
                            <>
                                <Spinner size='sm' animation='border' className='me-1' />
                                Procesando…
                            </>
                        )
                        : textoConfirmar}
                </Button>
            </Modal.Footer>
        </Modal>
    )
}
