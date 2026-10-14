import { NavLink } from 'react-router-dom';
import { useBottomNav } from '../../navigation/useBottomNav';
import s from './BottomNavbar.module.css';

export function BottomNavbar() {
  const opciones = useBottomNav();
  return (
    <nav className={`${s.container} elevation-3`} aria-label="Navegación principal">
      <ul className={s.nav}>

        {opciones.map(({ to, label, icon, end }) => (
          <li key={to} className={s.item}>
            <NavLink to={to} end={end} className={({ isActive }) => isActive ? `${s.link} ${s.active}` : s.link
              }
            >
              {icon && <i className={`bi ${icon} ${s.icon}`} aria-hidden="true" />}
              <span className="text-label-md">{label}</span>
            </NavLink>
          </li>
        ))}

      </ul>
    </nav>
  );
}
