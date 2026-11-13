import { Navbar, Container } from "react-bootstrap"
import { Link } from 'react-router-dom'
import logo from '../../assets/logo/gastroapp-logo-256x256.png'
import s from './navbar.module.css'
import { useState } from "react"
import { useRol } from "../../context/RolesContext/useRol"
import { INICIO_POR_ROL } from "../../navigation/inicios"
import { BotonNotificaciones } from "../Notificaciones/BotonNotificaciones"
import { ModalPerfil } from "../Usuario/ModalPerfil"

export function NavbarComponent(){
  const [showPerfil, setShowPerfil] = useState(false)
  const { usuario, nombreRol } = useRol()
  const esStaff = usuario !== null
  // Staff: el logo lleva al panel de su rol. Cliente (sin sesión staff): al landing.
  const inicio = (nombreRol && INICIO_POR_ROL[nombreRol]) ?? '/'

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

            <ModalPerfil
              show={showPerfil}
              onCerrar={() => setShowPerfil(false)}
            />
          </>
        )}
      </Container>
    </Navbar>
    )
}
