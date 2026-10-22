import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert, Spinner } from 'react-bootstrap'
import { useRol } from '../../../context/RolesContext/useRol'
import { getDashboard } from '../../../api/dashboard'
import type { DashboardDatos } from '../../../types/Dashboard'
import s from '../gerente.module.css'

const formatearPrecio = (precio: number): string =>
    new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0,
    }).format(precio)

// Los 7 estados del DER siempre vienen en la respuesta; el orden es el
// del flujo del backend (ReporteService::ESTADOS_TODOS).
const ESTADOS: Record<string, string> = {
    en_curso: 'En curso',
    confirmado: 'Confirmado',
    enviado: 'Enviado',
    en_preparacion: 'En preparación',
    entregado: 'Entregado',
    cerrado: 'Cerrado',
    cancelado: 'Cancelado',
}

const ACCESOS = [
    { to: '/gerente/carta', icon: 'bi-journal-text', title: 'Carta', desc: 'Platos, disponibilidad y promociones' },
    { to: '/gerente/mesas', icon: 'bi-grid-3x3-gap', title: 'Mesas', desc: 'Gestión de mesas, QR y comandas' },
    { to: '/gerente/reservas', icon: 'bi-calendar-check', title: 'Reservas', desc: 'Gestioná las reservas del local' },
    { to: '/gerente/usuarios', icon: 'bi-people', title: 'Usuarios', desc: 'Usuarios y permisos del equipo' },
    ]

function etiquetaPeriodo(periodo: DashboardDatos['periodo']): string {
    if (periodo.desde === periodo.hasta) return `Hoy (${periodo.desde})`
    return `Del ${periodo.desde} al ${periodo.hasta}`
}

export function DashboardPage() {
    const { usuario } = useRol()
    const [datos, setDatos] = useState<DashboardDatos | null>(null)
    const [cargando, setCargando] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const controller = new AbortController()
        getDashboard(controller.signal)
            .then(respuesta => {
                setDatos(respuesta)
                setError(null)
            })
            .catch(err => {
                if (err instanceof DOMException && err.name === 'AbortError') return
                setError(err instanceof Error ? err.message : 'Error desconocido al cargar el dashboard')
            })
            .finally(() => {
                if (!controller.signal.aborted) setCargando(false)
            })
        return () => controller.abort()
    }, [])

    return (
        <div className={s.page}>
            <h1 className={`text-headline-md ${s.title}`}>Dashboard</h1>
            <p className={`text-body-md ${s.subtitle}`}>
                {usuario ? `Hola, ${usuario.nombre}. Este es el resumen del local.` : 'Resumen del local.'}
            </p>

            <section className={s.section}>
                <h2 className={`text-headline-sm ${s.sectionTitle}`}>Estadísticas</h2>

                {cargando && (
                    <div className={s.empty}>
                        <Spinner animation='border' />
                        <p className='text-body-sm'>Cargando estadísticas...</p>
                    </div>
                )}

                {!cargando && error && (
                    <Alert variant='danger' className='text-body-md'>{error}</Alert>
                )}

                {!cargando && !error && datos && (
                    <>
                        <div className={s.statGrid}>
                            <div className={s.statCard}>
                                <span className={s.statValue}>{formatearPrecio(datos.ventas.total)}</span>
                                <span className={s.statLabel}>Ventas del período</span>
                            </div>
                            <div className={s.statCard}>
                                <span className={s.statValue}>{datos.ventas.cantidad_pedidos}</span>
                                <span className={s.statLabel}>Pedidos vendidos</span>
                            </div>
                            <div className={s.statCard}>
                                <span className={s.statValue}>{formatearPrecio(datos.ventas.ticket_promedio)}</span>
                                <span className={s.statLabel}>Ticket promedio</span>
                            </div>
                            <div className={s.statCard}>
                                <span className={s.statValue}>{datos.reservas_hoy.pendientes}</span>
                                <span className={s.statLabel}>Reservas pendientes hoy</span>
                            </div>
                        </div>
                        <p className={`text-body-sm ${s.note}`}>
                            {etiquetaPeriodo(datos.periodo)} · solo pedidos entregados o cerrados cuentan como venta.
                        </p>
                    </>
                )}
            </section>

            {!cargando && !error && datos && (
                <>
                    <section className={s.section}>
                        <h2 className={`text-headline-sm ${s.sectionTitle}`}>Ocupación actual</h2>
                        <div className={s.statGrid}>
                            <div className={s.statCard}>
                                <span className={s.statValue}>{datos.ocupacion_actual.mesas.libres}</span>
                                <span className={s.statLabel}>Mesas libres</span>
                            </div>
                            <div className={s.statCard}>
                                <span className={s.statValue}>{datos.ocupacion_actual.mesas.ocupadas}</span>
                                <span className={s.statLabel}>Mesas ocupadas</span>
                            </div>
                            <div className={s.statCard}>
                                <span className={s.statValue}>{datos.ocupacion_actual.mesas.reservadas}</span>
                                <span className={s.statLabel}>Mesas reservadas</span>
                            </div>
                            <div className={s.statCard}>
                                <span className={s.statValue}>{datos.ocupacion_actual.porcentaje_aforo}%</span>
                                <span className={s.statLabel}>Aforo ocupado</span>
                            </div>
                        </div>
                        <p className={`text-body-sm ${s.note}`}>
                            {datos.ocupacion_actual.cubiertos_ocupados} de {datos.ocupacion_actual.aforo} cubiertos ·
                            {' '}{datos.ocupacion_actual.mesas.total} mesas en el salón.
                        </p>
                    </section>

                    <section className={s.section}>
                        <h2 className={`text-headline-sm ${s.sectionTitle}`}>Pedidos por estado</h2>
                        <div className={s.statGrid}>
                            {Object.entries(datos.pedidos_por_estado).map(([estado, cantidad]) => (
                                <div className={s.statCard} key={estado}>
                                    <span className={s.statValue}>{cantidad}</span>
                                    <span className={s.statLabel}>{ESTADOS[estado] ?? estado}</span>
                                </div>
                            ))}
                        </div>
                        <p className={`text-body-sm ${s.note}`}>
                            Conteo de pedidos en {etiquetaPeriodo(datos.periodo).toLowerCase()}.
                        </p>
                    </section>

                    <section className={s.section}>
                        <h2 className={`text-headline-sm ${s.sectionTitle}`}>Platos más vendidos</h2>
                        {datos.platos_mas_vendidos.length === 0 ? (
                            <p className={`text-body-sm ${s.note}`}>
                                No hay ventas registradas en el período.
                            </p>
                        ) : (
                            <ol className={s.listaTop}>
                                {datos.platos_mas_vendidos.map((fila, indice) => (
                                    <li className={s.filaTop} key={fila.plato_id}>
                                        <span className={`text-label-md ${s.filaTopPos}`}>#{indice + 1}</span>
                                        <span className={`text-body-md ${s.filaTopNombre}`}>{fila.nombre}</span>
                                        <span className={`text-body-sm ${s.filaTopMeta}`}>{fila.unidades} u.</span>
                                        <span className={`text-body-md ${s.filaTopTotal}`}>{formatearPrecio(fila.total)}</span>
                                    </li>
                                ))}
                            </ol>
                        )}
                    </section>

                    <section className={s.section}>
                        <h2 className={`text-headline-sm ${s.sectionTitle}`}>Reservas de hoy</h2>
                        <div className={s.statGrid}>
                            <div className={s.statCard}>
                                <span className={s.statValue}>{datos.reservas_hoy.pendientes}</span>
                                <span className={s.statLabel}>Pendientes</span>
                            </div>
                            <div className={s.statCard}>
                                <span className={s.statValue}>{datos.reservas_hoy.finalizadas}</span>
                                <span className={s.statLabel}>Finalizadas</span>
                            </div>
                            <div className={s.statCard}>
                                <span className={s.statValue}>{datos.reservas_hoy.canceladas}</span>
                                <span className={s.statLabel}>Canceladas</span>
                            </div>
                            <div className={s.statCard}>
                                <span className={s.statValue}>{datos.reservas_hoy.no_asistio}</span>
                                <span className={s.statLabel}>No asistió</span>
                            </div>
                        </div>
                        <p className={`text-body-sm ${s.note}`}>
                            {datos.reservas_hoy.total_personas_pendientes} personas esperadas en las reservas pendientes de hoy ({datos.reservas_hoy.fecha}).
                        </p>
                    </section>
                </>
            )}

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
