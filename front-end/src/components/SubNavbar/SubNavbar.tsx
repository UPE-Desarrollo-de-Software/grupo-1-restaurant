import { NavLink } from 'react-router-dom'
import { useSubnav } from '../../navigation/useSubnav'
import s from './SubNavbar.module.css'

export function SubNavbar() {
    const opciones = useSubnav()

    if (!opciones) return null

    return (
        <nav className={s.barra} aria-label="Sub-navegación de sección">
            <ul className={s.track}>
                {opciones.map(({ to, label, end }) => (
                    <li key={to} className={s.item}>
                        <NavLink
                            to={to}
                            end={end}
                            className={({ isActive }) => isActive ? `${s.tab} ${s.activo}` : s.tab}
                        >
                            <span className="text-label-md">{label}</span>
                        </NavLink>
                    </li>
                ))}
            </ul>
        </nav>
    )
}
