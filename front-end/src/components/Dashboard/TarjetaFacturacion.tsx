import type { RangoPeriodo } from '../../utils/dashboard'
import { etiquetaRango, formatearMonto, formatearVariacion, variacionPct } from '../../utils/dashboard'
import s from './Dashboard.module.css'

interface TarjetaFacturacionProps {
    total: number
    totalAnterior: number
    rango: RangoPeriodo
}

function aspectoVariacion(pct: number | null) {
    if (pct === null) {
        return { clase: s.variacionNeutra, icono: 'bi-dash-lg', texto: formatearVariacion(null) }
    }
    if (pct > 0) {
        return { clase: s.variacionPos, icono: 'bi-arrow-up-right', texto: formatearVariacion(pct) }
    }
    if (pct < 0) {
        return { clase: s.variacionNeg, icono: 'bi-arrow-down-right', texto: formatearVariacion(pct) }
    }
    return { clase: s.variacionNeutra, icono: 'bi-dash-lg', texto: 'Sin cambios' }
}

export function TarjetaFacturacion({ total, totalAnterior, rango }: TarjetaFacturacionProps) {
    const aspecto = aspectoVariacion(variacionPct(total, totalAnterior))

    return (
        <section className={s.panel} aria-label='Facturación del período'>
            <div className={s.panelCabecera}>
                <div>
                    <h2 className={`text-headline-sm ${s.panelTitulo}`}>Facturación</h2>
                    <p className={`text-body-sm ${s.panelSubtitulo}`}>Pedidos entregados en el período</p>
                </div>
                <span className={s.icono} aria-hidden='true'>
                    <i className='bi bi-cash-stack' />
                </span>
            </div>

            <p className={s.facturacionMonto}>{formatearMonto(total)}</p>

            <div className={s.facturacionMeta}>
                <span className={`text-label-md ${s.variacion} ${aspecto.clase}`}>
                    <i className={`bi ${aspecto.icono}`} aria-hidden='true' />
                    {aspecto.texto}
                </span>
                <span className='text-body-sm'>
                    vs. {formatearMonto(totalAnterior)} del período anterior
                </span>
            </div>

            <p className={`text-body-sm ${s.nota}`}>
                Solo pedidos en estado entregado, por fecha del pedido · {etiquetaRango(rango)}.
            </p>
        </section>
    )
}