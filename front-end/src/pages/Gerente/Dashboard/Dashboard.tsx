import { Link } from 'react-router-dom'
import { useRol } from '../../../context/RolesContext/useRol'
import s from '../gerente.module.css'

const ESTADISTICAS = [
    { label: 'Pedidos de hoy', valor: '—' },
    { label: 'Ventas del mes', valor: '—' },
    { label: 'Reservas de hoy', valor: '—' },
    { label: 'Productos en carta', valor: '—' },
]

const ACCESOS = [
    { to: '/gerente/carta', icon: 'bi-journal-text', title: 'Carta', desc: 'Productos, disponibilidad y promociones' },
    { to: '/gerente/mesas', icon: 'bi-grid-3x3-gap', title: 'Mesas', desc: 'Gestión de mesas, QR y comandas' },
    { to: '/gerente/reservas', icon: 'bi-calendar-check', title: 'Reservas', desc: 'Gestioná las reservas del local' },
    { to: '/gerente/usuarios', icon: 'bi-people', title: 'Usuarios', desc: 'Usuarios y permisos del equipo' },
    { to: '/gerente/historial-acciones', icon: 'bi-clock-history', title: 'Historial de acciones', desc: 'Trazabilidad de los usuarios' },
]

export function DashboardPage() {
    const { usuario } = useRol()

    return (
        <div className={s.page}>
            <h1 className={`text-headline-md ${s.title}`}>Dashboard</h1>
            <p className={`text-body-md ${s.subtitle}`}>
                {usuario ? `Hola, ${usuario.nombre}. Este es el resumen del local.` : 'Resumen del local.'}
            </p>

            <section className={s.section}>
                <h2 className={`text-headline-sm ${s.sectionTitle}`}>Estadísticas</h2>
                <div className={s.statGrid}>
                    {ESTADISTICAS.map(stat => (
                        <div className={s.statCard} key={stat.label}>
                            <span className={s.statValue}>{stat.valor}</span>
                            <span className={s.statLabel}>{stat.label}</span>
                        </div>
                    ))}
                </div>
                <p className={`text-body-sm ${s.note}`}>
                    Los datos se mostrarán acá cuando el backend exponga los endpoints de estadísticas.
                </p>
            </section>

            <section className={s.section}>
                <h2 className={`text-headline-sm ${s.sectionTitle}`}>Accesos rápidos</h2>
                <div className={s.grid}>
                    {ACCESOS.map(({ to, icon, title, desc }) => (
                        <Link to={to} className={s.card} key={to}>
                            <i className={`bi ${icon} ${s.icon}`} aria-hidden="true" />
                            <h3 className={`text-headline-sm ${s.cardTitle}`}>{title}</h3>
                            <p className={`text-body-sm ${s.cardDesc}`}>{desc}</p>
                        </Link>
                    ))}
                </div>
            </section>
        </div>
    )
}
