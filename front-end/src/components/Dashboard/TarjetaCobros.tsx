import type { CobrosPorMedio } from '../../types/Dashboard'
import { calcularCobros, formatearMonto, formatearPorcentaje } from '../../utils/dashboard'
import s from './Dashboard.module.css'

interface TarjetaCobrosProps {
    cobros: CobrosPorMedio
    // Facturación del período (ventas.total): solo para contextualizar
    // el "% cobrado". Cobros y ventas usan bases de fecha distintas.
    ventasTotal: number
}

function pagos(cantidad: number): string {
    return cantidad === 1 ? '1 pago' : `${cantidad} pagos`
}

export function TarjetaCobros({ cobros, ventasTotal }: TarjetaCobrosProps) {
    const desglose = calcularCobros(cobros)
    const porcentajeCobrado = ventasTotal > 0 ? (desglose.total * 100) / ventasTotal : 0

    return (
        <section className={s.panel} aria-label='Cobros del período'>
            <div className={s.panelCabecera}>
                <div>
                    <h2 className={`text-headline-sm ${s.panelTitulo}`}>Cobros</h2>
                    <p className={`text-body-sm ${s.panelSubtitulo}`}>Pagos aprobados, por fecha de pago</p>
                </div>
                <span className={s.icono} aria-hidden='true'>
                    <i className='bi bi-credit-card' />
                </span>
            </div>

            <div className={s.cobrosResumen}>
                <p className={s.cobrosTotal}>{formatearMonto(desglose.total)}</p>
                <span className={`text-label-md ${s.variacion} ${s.variacionNeutra}`}>
                    {ventasTotal > 0 ? `${formatearPorcentaje(porcentajeCobrado, 0)} cobrado` : 'Sin facturación'}
                </span>
            </div>

            <div
                className={s.barraCobros}
                role='img'
                aria-label={`Mercado Pago ${formatearPorcentaje(desglose.mercadoPago.porcentaje, 0)}, efectivo ${formatearPorcentaje(desglose.efectivo.porcentaje, 0)}`}
            >
                <span className={s.barraMp} style={{ width: `${desglose.mercadoPago.porcentaje}%` }} />
                <span className={s.barraEfectivo} style={{ width: `${desglose.efectivo.porcentaje}%` }} />
            </div>

            <div className={s.cobroFilas}>
                <div className={s.cobroFila}>
                    <span className={`${s.cobroPunto} ${s.cobroPuntoMp}`} aria-hidden='true' />
                    <span className={s.cobroTexto}>
                        <span className='text-body-md'>Mercado Pago</span>
                        <span className={`text-body-sm ${s.cobroMeta}`}>
                            {formatearPorcentaje(desglose.mercadoPago.porcentaje, 0)} · {pagos(desglose.mercadoPago.cantidad)}
                        </span>
                    </span>
                    <span className={`text-body-md ${s.cobroMonto}`}>{formatearMonto(desglose.mercadoPago.total)}</span>
                </div>

                <div className={s.cobroFila}>
                    <span className={`${s.cobroPunto} ${s.cobroPuntoEfectivo}`} aria-hidden='true' />
                    <span className={s.cobroTexto}>
                        <span className='text-body-md'>Efectivo</span>
                        <span className={`text-body-sm ${s.cobroMeta}`}>
                            {formatearPorcentaje(desglose.efectivo.porcentaje, 0)} · {pagos(desglose.efectivo.cantidad)}
                        </span>
                    </span>
                    <span className={`text-body-md ${s.cobroMonto}`}>{formatearMonto(desglose.efectivo.total)}</span>
                </div>
            </div>

            <p className={`text-body-sm ${s.nota}`}>
                Total de {pagos(desglose.cantidad)} aprobados por fecha de pago. No es la facturación:
                puede incluir visitas facturadas en otro período.
            </p>
        </section>
    )
}