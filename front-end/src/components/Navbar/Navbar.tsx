import { Navbar, Container, Modal, Button, CloseButton } from "react-bootstrap"
import { Link } from 'react-router-dom'
import logo from '../../assets/logo/gastroapp-logo-256x256.png'
import s from './navbar.module.css'
import { logoutSesion } from "../../api/auth"
import { cerrarEchoEmpleado } from "../../realtime/empleado"
import { useNavigate } from "react-router-dom"
import { useState } from "react"
import { useRol } from "../../context/RolesContext/useRol"
import { INICIO_POR_ROL } from "../../navigation/inicios"
import { BotonNotificaciones } from "../Notificaciones/BotonNotificaciones"

export function NavbarComponent(){
  const navigate = useNavigate()
  const [showPerfil, setShowPerfil] = useState(false)
  const { usuario, nombreRol } = useRol()
  const esStaff = usuario !== null
  // Staff: el logo lleva al panel de su rol. Cliente (sin sesión staff): al landing.
  const inicio = (nombreRol && INICIO_POR_ROL[nombreRol]) ?? '/'

  async function handleLogout(){
    await logoutSesion()
    // El socket del staff se firma con el token: se cierra junto con la sesión.
    cerrarEchoEmpleado()
    setShowPerfil(false)
    navigate('/login', {replace: true})
  }

    return(
    <Navbar className={s.barra}>
      <Container className="d-flex justify-content-between align-items-center">
        <Navbar.Brand as={Link} to={inicio} className="d-flex align-items-center">
          <img
            alt="Logo GastroApp"
            src={logo}
            width="50"
            className="me-2"
          />
          <h3 className="text-headline-md mb-0">
            GastroApp
          </h3>
        </Navbar.Brand>
        {esStaff && (
          <>
            <div className="d-flex align-items-center gap-2">
              {nombreRol === 'Mozo' && <BotonNotificaciones />}
              <button
                type="button"
                className={s.avatar}
                aria-label="Abrir mi perfil"
                onClick={() => setShowPerfil(true)}
              >
                <i className="bi bi-person-circle" />
              </button>
            </div>

            <Modal
              show={showPerfil}
              onHide={() => setShowPerfil(false)}
              centered
              contentClassName={s.modalContent}
            >
              <Modal.Body className={s.modalBody}>
                <CloseButton
                  className={s.modalClose}
                  onClick={() => setShowPerfil(false)}
                />
                <div className={s.modalAvatar} aria-hidden="true">
                  <i className="bi bi-person-circle" />
                </div>
                <h2 id="perfil-title" className={`text-headline-md text-center ${s.modalTitle}`}>
                  {usuario?.nombre ?? "Usuario"}
                </h2>
                {usuario?.email && (
                  <p className={`text-body-md text-center ${s.modalEmail}`}>
                    {usuario.email}
                  </p>
                )}
                <Button
                  variant="primary"
                  className={`w-100 ${s.modalAction}`}
                  onClick={handleLogout}
                >
                  Cerrar sesión
                </Button>
                <Button
                  variant="link"
                  className={`w-100 text-body-md ${s.modalCancel}`}
                  onClick={() => setShowPerfil(false)}
                >
                  Cerrar
                </Button>
              </Modal.Body>
            </Modal>
          </>
        )}
      </Container>
    </Navbar>
    )
}