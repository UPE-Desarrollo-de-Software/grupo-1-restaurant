import { Button, CloseButton, Modal } from 'react-bootstrap'
import { useNavigate } from 'react-router-dom'
import { logoutSesion } from '../../api/auth'
import { cerrarEchoEmpleado } from '../../realtime/empleado'
import { useRol } from '../../context/RolesContext/useRol'
import s from './Usuario.module.css'

interface ModalPerfilProps {
    show: boolean
    onCerrar: () => void
}

// Modal de perfil / sesión del empleado. Es el MISMO modal que abre el
// avatar del Navbar y el bloque de usuario del Side Navbar: la lógica
// (logout + cierre del socket) vive acá una sola vez.
export function ModalPerfil({ show, onCerrar }: ModalPerfilProps) {
    const navigate = useNavigate()
    const { usuario } = useRol()

    async function handleLogout() {
        await logoutSesion()
        // El socket del staff se firma con el token: se cierra junto con la sesión.
        cerrarEchoEmpleado()
        onCerrar()
        navigate('/login', { replace: true })
    }

    return (
        <Modal
            show={show}
            onHide={onCerrar}
            centered
            contentClassName={s.modalContent}
        >
            <Modal.Body className={s.modalBody}>
                <CloseButton
                    className={s.modalClose}
                    onClick={onCerrar}
                />
                <div className={s.modalAvatar} aria-hidden='true'>
                    <i className='bi bi-person-circle' />
                </div>
                <h2 id='perfil-title' className={`text-headline-md text-center ${s.modalTitle}`}>
                    {usuario?.nombre ?? 'Usuario'}
                </h2>
                {usuario?.email && (
                    <p className={`text-body-md text-center ${s.modalEmail}`}>
                        {usuario.email}
                    </p>
                )}
                <Button
                    variant='primary'
                    className={`w-100 ${s.modalAction}`}
                    onClick={handleLogout}
                >
                    Cerrar sesión
                </Button>
                <Button
                    variant='link'
                    className={`w-100 text-body-md ${s.modalCancel}`}
                    onClick={onCerrar}
                >
                    Cerrar
                </Button>
            </Modal.Body>
        </Modal>
    )
}
