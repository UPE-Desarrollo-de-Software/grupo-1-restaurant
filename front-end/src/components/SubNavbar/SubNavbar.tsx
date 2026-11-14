import { Link, useLocation } from 'react-router-dom'
import { opcionActiva } from '../../navigation/rutas'
import { useSubnav } from '../../navigation/useSubnav'
import s from './SubNavbar.module.css'

export function SubNavbar() {
    const seccion = useSubnav()
    const { pathname } = useLocation()

    if (!seccion) return null

    // En la raíz de la sección (el hub) marcamos la primera opción: es la
    // pantalla a la que lleva su tab del bottom nav.
    const enRaiz = pathname === seccion.prefijo

    return (
        <nav className={s.barra} aria-label="Sub-navegación de sección">
            <ul className={s.track}>
                {seccion.opciones.map((opcion, indice) => {
                    const activa = enRaiz
                        ? indice === 0
                        : opcionActiva(pathname, opcion)

                    return (
                        <li key={opcion.to} className={s.item}>
                            <Link
                                to={opcion.to}
                                className={activa ? `${s.tab} ${s.activo}` : s.tab}
                                aria-current={activa ? 'page' : undefined}
                            >
                                <span className="text-label-md">{opcion.label}</span>
                            </Link>
                        </li>
                    )
                })}
            </ul>
        </nav>
    )
}
