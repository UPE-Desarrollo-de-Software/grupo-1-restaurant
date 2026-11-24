import { Outlet } from 'react-router-dom'
import { BottomNavbar } from '../components/BottomNavbar/BottomNavbar'
import { NavbarComponent } from '../components/Navbar/Navbar'
import { SideNavbar } from '../components/SideNavbar/SideNavbar'
import { SubNavbar } from '../components/SubNavbar/SubNavbar'
import type { OpcionNav } from '../navigation/tipos'
import s from './LayoutLateral.module.css'

interface LayoutLateralProps {
    opciones: OpcionNav[]
    inicio?: string
}

// Shell reutilizable para los módulos que en escritorio usan Side Navbar.
// En móvil conserva la navegación actual (Navbar + SubNavbar + BottomNavbar).
// Las dos variantes se pintan siempre y el CSS muestra una u otra según el
// ancho, así no hay parpadeo ni lógica de breakpoints en JS.
export function LayoutLateral({ opciones, inicio }: LayoutLateralProps) {
    return (
        <div className={s.shell}>
            <div className={s.lateral}>
                <SideNavbar opciones={opciones} inicio={inicio} />
            </div>

            <div className={s.barraSuperior}>
                <NavbarComponent />
                <SubNavbar />
            </div>

            <main className={s.contenido}>
                <Outlet />
            </main>

            <div className={s.bottomNav}>
                <BottomNavbar />
            </div>
        </div>
    )
}
