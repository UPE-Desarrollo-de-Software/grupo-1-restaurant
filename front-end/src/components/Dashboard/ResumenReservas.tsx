import type { EstadoReserva } from '../../types/Reserva'
import type { RangoPeriodo, ResumenReservas as ResumenReservasDatos } from '../../utils/dashboard'
import {
    ETIQUETAS_RESERVA,
    etiquetaRango,
    formatearNumero,
    formatearPorcentaje,
    tasaNoShow,
} from '../../utils/dashboard'
import s from './Dashboard.module.css'

interface ResumenReservasProps {
    resumen: ResumenReservasDatos
    rango: RangoPeriodo
    cargando?: boolean
}

const ESTADOS: { estado: EstadoReserva; punto: string }[] = [
    { estado: 'pendiente', punto: s.puntoPendiente },
    { estado: 'finalizada', punto: s.puntoFinalizada },
    { estado: 'cancelada', punto: s.puntoCancelada },
    { estado: 'no_asistio', punto: s.puntoNoAsistio },
]

export function ResumenReservas({ resumen, rango, cargando = false }: ResumenReservasProps) {
    return (
        <section className={s.panel} aria-label='Reservas del período'>
            <div className={s.panelCabecera}>
                <div>
                    <h2 className={`text-headline-sm ${s.panelTitulo}`}>Reservas</h2>
                    <p className={`text-body-sm ${s.panelSubtitulo}`}>Por estado · {etiquetaRango(rango)}</p>
                </div>
                <span className={s.icono} aria-hidden='true'>
                    <i className='bi bi-calendar-check' />
                </span>
            </div>

            {cargando ? (
                <p className={`text-body-sm ${s.vacio}`}>Cargando reservas...</p>
            ) : (
                <>
                    <div className={s.reservasGrid}>
                        {ESTADOS.map(({ estado, punto }) => (
                            <div className={s.reservaCard} key={estado}>
                                <span className={s.reservaValor}>{formatearNumero(resumen[estado])}</span>
                                <span className={`text-label-md ${s.reservaLabel}`}>
                                    <span className={`${s.reservaPunto} ${punto}`} aria-hidden='true' />
                                    {ETIQUETAS_RESERVA[estado]}
                                </span>
                            </div>
                        ))}
                    </div>

                    <p className={`text-body-sm ${s.nota}`}>
                        {formatearNumero(resumen.total)} reservas en el período ·{' '}
                        {formatearPorcentaje(tasaNoShow(resumen), 0)} de inasistencias.
                    </p>
                </>
            )}
        </section>
    )
}