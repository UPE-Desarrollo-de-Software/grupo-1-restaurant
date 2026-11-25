import { useEffect, useState } from 'react'
import { Alert } from 'react-bootstrap'
import { useRol } from '../../../context/RolesContext/useRol'
import { getDashboard } from '../../../api/dashboard'
import { getReservas } from '../../../api/reservas'
import type { DashboardDatos } from '../../../types/Dashboard'
import type { Reserva } from '../../../types/Reserva'
import GastroLoader from '../../../components/GastroLoader/GastroLoader'
import { FiltroPeriodo } from '../../../components/Dashboard/FiltroPeriodo'
import { TarjetaFacturacion } from '../../../components/Dashboard/TarjetaFacturacion'
import { TarjetaKpi } from '../../../components/Dashboard/TarjetaKpi'
import { TarjetaCobros } from '../../../components/Dashboard/TarjetaCobros'
import { TopPlatos } from '../../../components/Dashboard/TopPlatos'
import { CategoriasDonut } from '../../../components/Dashboard/CategoriasDonut'
import { ResumenReservas } from '../../../components/Dashboard/ResumenReservas'
import {
    agruparReservasPorEstado,
    formatearMonto,
    formatearNumero,
    rangoAnterior,
    rangoDePeriodo,
    variacionPct,
} from '../../../utils/dashboard'
import type { PeriodoId } from '../../../utils/dashboard'
import s from '../../../components/Dashboard/Dashboard.module.css'

// El dashboard actual + el período anterior, atados al período con el que
// se pidieron: evita mostrar números viejos mientras carga el nuevo (y
// permite derivar el loading sin setState sincrónico en el effect).
type CargaDashboard =
    | { estado: 'ok'; periodo: PeriodoId; datos: DashboardDatos; anterior: DashboardDatos }
    | { estado: 'error'; periodo: PeriodoId; mensaje: string }

export function DashboardPage() {
    const { nombreRol } = useRol()
    const [periodo, setPeriodo] = useState<PeriodoId>('7d')
    const [carga, setCarga] = useState<CargaDashboard | null>(null)
    const [reservas, setReservas] = useState<Reserva[] | null>(null)
    const [errorReservas, setErrorReservas] = useState<string | null>(null)

    // Dashboard + período anterior en paralelo, re-consultados al cambiar
    // el período (las ventas y los cobros usan fechas distintas del back).
    useEffect(() => {
        const controller = new AbortController()
        const rango = rangoDePeriodo(periodo)
        const previo = rangoAnterior(rango)

        Promise.all([
            getDashboard(rango, controller.signal),
            getDashboard(previo, controller.signal),
        ])
            .then(([datos, anterior]) => {
                setCarga({ estado: 'ok', periodo, datos, anterior })
            })
            .catch((err: unknown) => {
                if (err instanceof DOMException && err.name === 'AbortError') return
                setCarga({
                    estado: 'error',
                    periodo,
                    mensaje: err instanceof Error ? err.message : 'Error desconocido al cargar el dashboard',
                })
            })

        return () => controller.abort()
    }, [periodo])

    // Las reservas se bajan UNA vez: el backend no acepta rango de fechas,
    // así que el período se filtra en el front (agruparReservasPorEstado).
    useEffect(() => {
        const controller = new AbortController()

        getReservas(controller.signal)
            .then(listado => {
                setReservas(listado)
                setErrorReservas(null)
            })
            .catch((err: unknown) => {
                if (err instanceof DOMException && err.name === 'AbortError') return
                setErrorReservas(err instanceof Error ? err.message : 'Error desconocido al cargar las reservas')
            })

        return () => controller.abort()
    }, [])

    const actual = carga && carga.periodo === periodo ? carga : null
    const datos = actual?.estado === 'ok' ? actual.datos : null
    const anterior = actual?.estado === 'ok' ? actual.anterior : null
    const error = actual?.estado === 'error' ? actual.mensaje : null
    const cargando = !error && datos === null

    const rango = rangoDePeriodo(periodo)
    const resumenReservas = agruparReservasPorEstado(reservas ?? [], rango)
    const cargandoReservas = reservas === null && errorReservas === null

    return (
        <div className={s.contenedor}>
            <header className={s.cabecera}>
                <div>
                    <h1 className={`text-headline-md ${s.titulo}`}>Estadísticas Comerciales</h1>
                    <p className={`text-body-md ${s.subtitulo}`}>
                        Rendimiento económico y flujo comercial del local.
                    </p>
                </div>
                <span className={`text-label-md ${s.chipRol}`}>
                    <i className='bi bi-person-badge' aria-hidden='true' />
                    {nombreRol ?? 'Gerente'}
                </span>
            </header>

            <FiltroPeriodo valor={periodo} onChange={setPeriodo} />

            {cargando && (
                <div className={s.panel}>
                    <GastroLoader messages={['Cargando estadísticas...']} />
                </div>
            )}

            {!cargando && error && (
                <Alert variant='danger' className='text-body-md'>{error}</Alert>
            )}

            {!cargando && datos && anterior && (
                <div className={s.layout}>
                    <div className={s.columna}>
                        <TarjetaFacturacion
                            total={datos.ventas.total}
                            totalAnterior={anterior.ventas.total}
                            rango={rango}
                        />

                        <div className={s.kpis}>
                            <TarjetaKpi
                                etiqueta='Pedidos entregados'
                                valor={formatearNumero(datos.ventas.cantidad_pedidos)}
                                icono='bi-receipt'
                                variacion={variacionPct(
                                    datos.ventas.cantidad_pedidos,
                                    anterior.ventas.cantidad_pedidos,
                                )}
                                nota='Solo pedidos en estado entregado'
                            />
                            <TarjetaKpi
                                etiqueta='Ticket promedio'
                                valor={formatearMonto(datos.ventas.ticket_promedio)}
                                icono='bi-graph-up-arrow'
                                variacion={variacionPct(
                                    datos.ventas.ticket_promedio,
                                    anterior.ventas.ticket_promedio,
                                )}
                                nota='Promedio por pedido entregado'
                            />
                        </div>

                        <TarjetaCobros cobros={datos.cobros} ventasTotal={datos.ventas.total} />
                    </div>

                    <div className={s.columna}>
                        <TopPlatos platos={datos.platos_mas_vendidos} />
                        <CategoriasDonut categorias={datos.categorias_mas_vendidas} />

                        {errorReservas ? (
                            <Alert variant='warning' className='text-body-sm mb-0'>{errorReservas}</Alert>
                        ) : (
                            <ResumenReservas
                                resumen={resumenReservas}
                                rango={rango}
                                cargando={cargandoReservas}
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}