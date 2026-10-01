import { Navbar, Container, Modal, Button, CloseButton } from "react-bootstrap"
import { Link } from 'react-router-dom'
import logo from '../../assets/logo/gastroapp-logo-256x256.png'
import s from './navbar.module.css'
import { getUsuario, logoutLocal } from "../../api/auth"
import { useNavigate } from "react-router-dom"
import { useState } from "react"

export function NavbarComponent(){
  const navigate = useNavigate()
  const [showPerfil, setShowPerfil] = useState(false)
  const usuario = getUsuario()
  const esStaff = usuario !== null

  function handleLogout(){
    logoutLocal()
    setShowPerfil(false)
    navigate('/login', {replace: true})
  }

    return(
    <Navbar className={s.barra}>
      <Container className="d-flex justify-content-between align-items-center">
        <Navbar.Brand as={Link} to="/menu" className="d-flex align-items-center">
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
            <button
              type="button"
              className={s.avatar}
              aria-label="Abrir mi perfil"
              onClick={() => setShowPerfil(true)}
            >
              <i className="bi bi-person-circle" />
            </button>

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