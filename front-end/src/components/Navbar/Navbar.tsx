import { Navbar,Container} from "react-bootstrap"
import { Link } from 'react-router-dom'
import logo from '../../assets/logo/gastroapp-logo-256x256.png'
import s from './navbar.module.css'

interface NavbarProps {
    showUserAvatar?: boolean
}

export function NavbarComponent({ showUserAvatar = false }: NavbarProps){
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
        {showUserAvatar && (
          <span className={s.avatar} role="img" aria-label="Usuario">
            <i className="bi bi-person-circle" />
          </span>
        )}
      </Container>
    </Navbar>
    )
}