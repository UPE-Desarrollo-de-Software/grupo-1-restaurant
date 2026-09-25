import { NavLink } from 'react-router-dom';
import s from './BottomNavbar.module.css';

interface NavOption {
  to: string;
  label: string;
  icon: string;
}

const OPCIONES: NavOption[] = [
  { to: '/menu', label: 'Menu', icon: 'bi-journal-text' },
  { to: '/pedido', label: 'Mi pedido', icon: 'bi-basket' },
  { to: '/reservas', label: 'Reservas', icon: 'bi-calendar-check' },
  { to: '/unir-mesa', label: 'Unir Mesa', icon: 'bi-people' },
];

export function BottomNavbar() {
  return (
    <nav className={`${s.container} elevation-3`} aria-label="Navegación principal">
      <ul className={s.nav}>

        {OPCIONES.map(({ to, label, icon }) => (
          <li key={to} className={s.item}>
            <NavLink to={to} className={({ isActive }) => isActive ? `${s.link} ${s.active}` : s.link
              }
            >
              <i className={`bi ${icon} ${s.icon}`} aria-hidden="true" />
              <span className="text-label-md">{label}</span>
            </NavLink>
          </li>
        ))}
        
      </ul>
    </nav>
  );
}