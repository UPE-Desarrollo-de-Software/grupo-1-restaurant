import { NavLink } from 'react-router-dom';
import { useRol } from '../../context/RolesContext/useRol';
import s from './BottomNavbar.module.css';

interface NavOption {
  to: string;
  label: string;
  icon: string;
  end?: boolean;
}

const OPCIONES_CLIENTE: NavOption[] = [
  { to: '/menu', label: 'Carta', icon: 'bi-journal-text' },
  { to: '/pedido', label: 'Mi pedido', icon: 'bi-basket' },
  { to: '/reservas', label: 'Reservas', icon: 'bi-calendar-check' },
  { to: '/unir-mesa', label: 'Mesa', icon: 'bi-box-arrow-in-right' },
];

const OPCIONES_GERENTE: NavOption[] = [
  { to: '/gerente', label: 'Panel', icon: 'bi-bar-chart-line', end: true },
  { to: '/gerente/carta', label: 'Carta', icon: 'bi-journal-text' },
  { to: '/gerente/mesas', label: 'Mesas', icon: 'bi-grid-3x3-gap' },
  { to: '/gerente/reservas', label: 'Reservas', icon: 'bi-calendar-check' },
];

export function BottomNavbar() {
  const {esGerente} = useRol()
  const opciones= esGerente ? OPCIONES_GERENTE: OPCIONES_CLIENTE
  return (
    <nav className={`${s.container} elevation-3`} aria-label="Navegación principal">
      <ul className={s.nav}>

        {opciones.map(({ to, label, icon, end }) => (
          <li key={to} className={s.item}>
            <NavLink to={to} end={end} className={({ isActive }) => isActive ? `${s.link} ${s.active}` : s.link
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