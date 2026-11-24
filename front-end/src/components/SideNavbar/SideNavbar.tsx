import { Link, useLocation } from 'react-router-dom'
import logo from '../../assets/logo/gastroapp-logo-256x256.png'
import { useRol } from '../../context/RolesContext/useRol'
import { INICIO_POR_ROL } from '../../navigation/inicios'
import { opcionActiva } from '../../navigation/rutas'
import type { OpcionNav } from '../../navigation/tipos'
import { UsuarioNav } from '../Usuario/UsuarioNav'
import s from './SideNavbar.module.css'

interface SideNavbarProps {
    // Opciones del módulo. El componente no conoce ningún rol ni ruta fija:
    // las recibe armadas (ver navigation/useSideNav.ts).
    opciones: OpcionNav[]
    // Link del logo. Por defecto, el panel principal del rol.
    inicio?: string
}

// Navegación lateral de escritorio: identidad arriba, opciones del módulo
// en el medio, espacio flexible y la cuenta del usuario al final.
export function SideNavbar({ opciones, inicio }: SideNavbarProps) {
    const { nombreRol } = useRol()
    const { pathname } = useLocation()
    const destino = inicio ?? (nombreRol ? INICIO_POR_ROL[nombreRol] : undefined) ?? '/'

    return (
        <nav className={s.lateral} aria-label='Navegación principal'>
            <div className={s.marca}>
                <Link to={destino} className={s.marcaLink}>
                    <img
                        alt='Logo GastroApp'
                        src={logo}
                        width='50'
                        className={s.logo}
                    />
                    <span className={`text-headline-md ${s.nombreApp}`}>GastroApp</span>
                </Link>
            </div>

            <ul className={s.opciones}>
                {opciones.map((opcion) => {
                    const { to, label, icon } = opcion
                    const activa = opcionActiva(pathname, opcion)

                    return (
                        <li key={to}>
                            <Link
                                to={to}
                                className={activa ? `${s.link} ${s.activo}` : s.link}
                                aria-current={activa ? 'page' : undefined}
                            >
                                {icon && <i className={`bi ${icon} ${s.icono}`} aria-hidden='true' />}
                                <span className='text-label-md'>{label}</span>
                            </Link>
                        </li>
                    )
                })}
            </ul>

            <div className={s.espacio} />

            <div className={s.usuario}>
                <UsuarioNav />
            </div>
        </nav>
    )
}
