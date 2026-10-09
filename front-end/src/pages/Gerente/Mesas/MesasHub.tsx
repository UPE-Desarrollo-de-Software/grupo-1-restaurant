import { Link } from 'react-router-dom'
import s from '../gerente.module.css'

export function MesasHubPage() {
    return (
        <div className={s.page}>
            <h1 className={`text-headline-md ${s.title}`}>Mesas</h1>
            <p className={`text-body-md ${s.subtitle}`}>Gestioná las mesas del local</p>

            <div className={s.grid}>
                <Link to='/gerente/mesas/gestion' className={s.card}>
                    <i className={`bi bi-grid-3x3-gap ${s.icon}`} aria-hidden="true" />
                    <h2 className={`text-headline-sm ${s.cardTitle}`}>Gestión de mesas</h2>
                    <p className={`text-body-sm ${s.cardDesc}`}>Alta, edición y baja de mesas</p>
                </Link>

                <Link to='/gerente/mesas/qr' className={s.card}>
                    <i className={`bi bi-qr-code ${s.icon}`} aria-hidden="true" />
                    <h2 className={`text-headline-sm ${s.cardTitle}`}>Códigos QR</h2>
                    <p className={`text-body-sm ${s.cardDesc}`}>Asociá un código QR a cada mesa</p>
                </Link>

                <Link to='/gerente/mesas/comandas' className={s.card}>
                    <i className={`bi bi-receipt ${s.icon}`} aria-hidden="true" />
                    <h2 className={`text-headline-sm ${s.cardTitle}`}>Comandas</h2>
                    <p className={`text-body-sm ${s.cardDesc}`}>Historial de comandas de las mesas</p>
                </Link>
            </div>
        </div>
    )
}
