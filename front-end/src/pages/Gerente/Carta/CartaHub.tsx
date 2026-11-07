import { Link } from 'react-router-dom'
import s from '../gerente.module.css'

export function CartaHubPage() {
    return (
        <div className={s.page}>
            <p className={`text-body-md ${s.subtitle}`}>Gestioná la carta del restaurante</p>

            <div className={s.grid}>
                <Link to='/gerente/carta/platos' className={s.card}>
                    <i className={`bi bi-card-list ${s.icon}`} aria-hidden="true" />
                    <div className={s.cardContent}>
                        <h2 className={`text-headline-sm ${s.cardTitle}`}>Platos</h2>
                        <p className={`text-body-sm ${s.cardDesc}`}>Creá, editá y gestioná la disponibilidad de los platos</p>
                    </div>
                </Link>

                <Link to='/gerente/carta/promociones' className={s.card}>
                    <i className={`bi bi-tags ${s.icon}`} aria-hidden="true" />
                    <div className={s.cardContent}>
                        <h2 className={`text-headline-sm ${s.cardTitle}`}>Promociones</h2>
                        <p className={`text-body-sm ${s.cardDesc}`}>Creá, editá y administrá los ingredientes</p>
                    </div>
                </Link>

                <Link to='/gerente/carta/categorias' className={s.card}>
                    <i className={`bi bi-bookmark ${s.icon}`} aria-hidden="true" />
                    <div className={s.cardContent}>
                        <h2 className={`text-headline-sm ${s.cardTitle}`}>Categorías</h2>
                        <p className={`text-body-sm ${s.cardDesc}`}>Creá, editá y organizá las categorías de la carta</p>
                    </div>
                </Link>

                <Link to='/gerente/carta/ingredientes' className={s.card}>
                    <i className={`bi bi-egg ${s.icon}`} aria-hidden="true" />
                    <div className={s.cardContent}>
                        <h2 className={`text-headline-sm ${s.cardTitle}`}>Ingredientes</h2>
                        <p className={`text-body-sm ${s.cardDesc}`}>Creá, editá y administrá los ingredientes</p>
                    </div>
                </Link>
            </div>
        </div>
    )
}
