import type { PlatoVendido } from '../../types/Dashboard'
import { formatearMonto, formatearNumero } from '../../utils/dashboard'
import s from './Dashboard.module.css'

const TOP = 5

interface TopPlatosProps {
    platos: PlatoVendido[]
}

export function TopPlatos({ platos }: TopPlatosProps) {
    const top = platos.slice(0, TOP)
    const maximo = top.reduce((mayor, fila) => Math.max(mayor, fila.unidades), 0)

    return (
        <section className={s.panel} aria-label='Productos más vendidos'>
            <div className={s.panelCabecera}>
                <div>
                    <h2 className={`text-headline-sm ${s.panelTitulo}`}>Productos más vendidos</h2>
                    <p className={`text-body-sm ${s.panelSubtitulo}`}>Top {TOP} por unidades</p>
                </div>
                <span className={s.icono} aria-hidden='true'>
                    <i className='bi bi-basket' />
                </span>
            </div>

            {top.length === 0 ? (
                <p className={`text-body-sm ${s.vacio}`}>No hay ventas registradas en el período.</p>
            ) : (
                <ol className={s.topLista}>
                    {top.map((fila, indice) => (
                        <li className={s.topFila} key={fila.plato_id}>
                            <div className={s.topLinea}>
                                <span className={`text-label-md ${s.topPos}`}>#{indice + 1}</span>
                                <span className={`text-body-md ${s.topNombre}`}>{fila.nombre}</span>
                                <span className={`text-body-sm ${s.topUnidades}`}>{formatearNumero(fila.unidades)} u.</span>
                                <span className={`text-body-sm ${s.topMonto}`}>{formatearMonto(fila.total)}</span>
                            </div>
                            <div className={s.topBarra} aria-hidden='true'>
                                <span
                                    className={s.topBarraRelleno}
                                    style={{ width: `${maximo > 0 ? (fila.unidades / maximo) * 100 : 0}%` }}
                                />
                            </div>
                        </li>
                    ))}
                </ol>
            )}
        </section>
    )
}