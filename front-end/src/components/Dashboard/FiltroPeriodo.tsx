import { OPCIONES_PERIODO } from '../../utils/dashboard'
import type { PeriodoId } from '../../utils/dashboard'
import s from './Dashboard.module.css'

interface FiltroPeriodoProps {
    valor: PeriodoId
    onChange: (periodo: PeriodoId) => void
}

export function FiltroPeriodo({ valor, onChange }: FiltroPeriodoProps) {
    return (
        <div className={s.filtro} role='group' aria-label='Período del dashboard'>
            {OPCIONES_PERIODO.map(opcion => (
                <button
                    key={opcion.id}
                    type='button'
                    className={`text-label-md ${s.chip} ${valor === opcion.id ? s.chipActivo : ''}`}
                    aria-pressed={valor === opcion.id}
                    onClick={() => onChange(opcion.id)}
                >
                    {opcion.label}
                </button>
            ))}
        </div>
    )
}