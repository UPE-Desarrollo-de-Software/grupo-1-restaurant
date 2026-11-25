import { formatearPorcentaje } from '../../utils/dashboard'
import s from './Dashboard.module.css'

interface TarjetaKpiProps {
    etiqueta: string
    valor: string
    icono: string
    nota?: string
    // `null` = no hay base de comparación; `undefined` = no mostrar chip.
    variacion?: number | null
}

function claseVariacion(pct: number): string {
    if (pct > 0) return s.variacionPos
    if (pct < 0) return s.variacionNeg
    return s.variacionNeutra
}

function iconoVariacion(pct: number): string {
    if (pct > 0) return 'bi-arrow-up-right'
    if (pct < 0) return 'bi-arrow-down-right'
    return 'bi-dash-lg'
}

export function TarjetaKpi({ etiqueta, valor, icono, nota, variacion }: TarjetaKpiProps) {
    return (
        <div className={s.panel}>
            <div className={s.kpiCabecera}>
                <span className={s.kpiIcono} aria-hidden='true'>
                    <i className={`bi ${icono}`} />
                </span>
                {variacion != null && (
                    <span
                        className={`text-label-md ${s.variacion} ${claseVariacion(variacion)}`}
                        title='Variación contra el período anterior'
                    >
                        <i className={`bi ${iconoVariacion(variacion)}`} aria-hidden='true' />
                        {formatearPorcentaje(Math.abs(variacion), 1)}
                    </span>
                )}
            </div>

            <p className={s.kpiValor}>{valor}</p>
            <p className={`text-label-md ${s.kpiLabel}`}>{etiqueta}</p>
            {nota && <p className={`text-body-sm ${s.nota}`}>{nota}</p>}
        </div>
    )
}