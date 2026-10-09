import { Link } from 'react-router-dom'
import s from '../gerente.module.css'

export function CartaHubPage() {
    return (
        <div className={s.page}>
            <h1 className={`text-headline-md ${s.title}`}>Carta</h1>
            <p className={`text-body-md ${s.subtitle}`}>Gestioná los productos de la carta</p>

            <div className={s.grid}>
                <Link to='/gerente/carta/productos' className={s.card}>
                    <i className={`bi bi-card-list ${s.icon}`} aria-hidden="true" />
                    <h2 className={`text-headline-sm ${s.cardTitle}`}>Productos</h2>
                    <p className={`text-body-sm ${s.cardDesc}`}>Alta, edición y baja de productos</p>
                </Link>

                <Link to='/gerente/carta/disponibilidad' className={s.card}>
                    <i className={`bi bi-toggle-on ${s.icon}`} aria-hidden="true" />
                    <h2 className={`text-headline-sm ${s.cardTitle}`}>Disponibilidad</h2>
                    <p className={`text-body-sm ${s.cardDesc}`}>Habilitá o deshabilitá productos de la carta</p>
                </Link>

                <Link to='/gerente/carta/promociones' className={s.card}>
                    <i className={`bi bi-tags ${s.icon}`} aria-hidden="true" />
                    <h2 className={`text-headline-sm ${s.cardTitle}`}>Promociones</h2>
                    <p className={`text-body-sm ${s.cardDesc}`}>Creá y administrá promociones</p>
                </Link>
            </div>
        </div>
    )
}
