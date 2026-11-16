import { Button, Modal } from 'react-bootstrap'
import { AficheMesaQr } from '../Mesas/AficheMesaQr'
import type { MesaConCodigo } from '../../types/Mesa'

interface QrMesaClienteModalProps {
    // Mesa a mostrar (null = modal oculto). Sólo se usan id y código.
    mesa: Pick<MesaConCodigo, 'id' | 'codigo_acceso'> | null
    // Cierre: X, clic afuera y el botón "Cerrar".
    onCerrar: () => void
}

// Variante del afiche para el comensal: muestra el QR de su mesa para que
// otro comensal entre directo. A diferencia del modal del staff no trae
// "Crear más" (es del alta) ni descarga PNG, y el botón del footer cierra.
export function QrMesaClienteModal({ mesa, onCerrar }: QrMesaClienteModalProps) {
    return (
        <Modal
            show={mesa !== null}
            onHide={onCerrar}
            centered
            aria-labelledby='qr-mesa-cliente-titulo'
        >
            <Modal.Header closeButton>
                <Modal.Title id='qr-mesa-cliente-titulo' className='text-headline-sm'>
                    QR de la mesa
                </Modal.Title>
            </Modal.Header>

            <Modal.Body>
                {mesa && <AficheMesaQr mesa={mesa} />}
            </Modal.Body>

            <Modal.Footer>
                <Button variant='primary' className='text-label-md' type='button' onClick={onCerrar}>
                    Cerrar
                </Button>
            </Modal.Footer>
        </Modal>
    )
}
