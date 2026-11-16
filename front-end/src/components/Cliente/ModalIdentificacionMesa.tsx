import { Button, Modal } from 'react-bootstrap'
import { useNavigate } from 'react-router-dom'

interface ModalIdentificacionMesaProps {
    show: boolean
    // "Cancelar" y la X: cierran y el cliente sigue navegando la carta.
    onCancelar: () => void
}

// Aviso al presionar "+ Agregar" sin mesa identificada: no se agrega nada
// porque el pedido siempre cuelga de una visita. "Ir a mi mesa" lleva al
// formulario del código (/mesa); desde ahí, "Ir a la Carta" vuelve a los
// platos y el botón ya agrega normalmente.
export function ModalIdentificacionMesa({ show, onCancelar }: ModalIdentificacionMesaProps) {
    const navigate = useNavigate()

    function irAMiMesa() {
        onCancelar()
        navigate('/mesa')
    }

    return (
        <Modal show={show} onHide={onCancelar} centered>
            <Modal.Header closeButton>
                <Modal.Title className='text-headline-sm'>Identificá tu mesa</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <p className='text-body-md mb-2'>
                    Para empezar tu pedido pone el código de tu mesa.
                </p>
                <p className='text-body-sm mb-0'>
                    Pedile el código de 4 dígitos a tu mozo.
                </p>
            </Modal.Body>
            <Modal.Footer>
                <Button
                    variant='outline-secondary'
                    className='text-label-md'
                    type='button'
                    onClick={onCancelar}
                >
                    Cancelar
                </Button>
                <Button
                    variant='primary'
                    className='text-label-md'
                    type='button'
                    onClick={irAMiMesa}
                >
                    <i className='bi bi-qr-code-scan me-1' aria-hidden='true' />
                    Ir a mi mesa
                </Button>
            </Modal.Footer>
        </Modal>
    )
}
