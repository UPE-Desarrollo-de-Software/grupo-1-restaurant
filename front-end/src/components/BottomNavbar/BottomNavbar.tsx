import { Link, useLocation } from 'react-router-dom';
import { opcionActiva } from '../../navigation/rutas';
import { useBottomNav } from '../../navigation/useBottomNav';
import s from './BottomNavbar.module.css';

export function BottomNavbar() {
  const opciones = useBottomNav();
  const { pathname } = useLocation();

  return (
    <nav className={`${s.container} elevation-3`} aria-label="Navegación principal">
      <ul className={s.nav}>

        {opciones.map((opcion) => {
          const { to, label, icon } = opcion;
          const activa = opcionActiva(pathname, opcion);

          return (
            <li key={to} className={s.item}>
              <Link
                to={to}
                className={activa ? `${s.link} ${s.active}` : s.link}
                aria-current={activa ? 'page' : undefined}
              >
                {icon && <i className={`bi ${icon} ${s.icon}`} aria-hidden="true" />}
                <span className="text-label-md">{label}</span>
              </Link>
            </li>
          );
        })}

      </ul>
    </nav>
  );
}
