import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'
import type { CategoriaVendida } from '../../types/Dashboard'
import { colorCategoria, formatearNumero, formatearPorcentaje } from '../../utils/dashboard'
import s from './Dashboard.module.css'

interface CategoriasDonutProps {
    categorias: CategoriaVendida[]
}

export function CategoriasDonut({ categorias }: CategoriasDonutProps) {
    const totalUnidades = categorias.reduce((total, fila) => total + fila.unidades, 0)

    return (
        <section className={s.panel} aria-label='Categorías más vendidas'>
            <div className={s.panelCabecera}>
                <div>
                    <h2 className={`text-headline-sm ${s.panelTitulo}`}>Categorías más vendidas</h2>
                    <p className={`text-body-sm ${s.panelSubtitulo}`}>Unidades entregadas por categoría</p>
                </div>
                <span className={s.icono} aria-hidden='true'>
                    <i className='bi bi-pie-chart' />
                </span>
            </div>

            {categorias.length === 0 || totalUnidades === 0 ? (
                <p className={`text-body-sm ${s.vacio}`}>No hay ventas registradas en el período.</p>
            ) : (
                <>
                    <div className={s.donut}>
                        <ResponsiveContainer width='100%' height={208}>
                            <PieChart>
                                <Pie
                                    data={categorias}
                                    dataKey='unidades'
                                    nameKey='nombre'
                                    innerRadius={62}
                                    outerRadius={92}
                                    paddingAngle={2}
                                    stroke='none'
                                    isAnimationActive={false}
                                >
                                    {categorias.map((fila, indice) => (
                                        <Cell key={fila.categoria_id} fill={colorCategoria(indice)} />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>

                        <div className={s.donutCentro} aria-hidden='true'>
                            <span className={s.donutTotal}>{formatearNumero(totalUnidades)}</span>
                            <span className={`text-label-md ${s.donutTotalLabel}`}>unidades</span>
                        </div>
                    </div>

                    <ul className={s.leyenda}>
                        {categorias.map((fila, indice) => (
                            <li className={s.leyendaFila} key={fila.categoria_id}>
                                <span
                                    className={s.leyendaPunto}
                                    style={{ backgroundColor: colorCategoria(indice) }}
                                    aria-hidden='true'
                                />
                                <span className={`text-body-sm ${s.leyendaNombre}`}>{fila.nombre}</span>
                                <span className={`text-body-sm ${s.leyendaValor}`}>
                                    {formatearPorcentaje((fila.unidades * 100) / totalUnidades, 0)} · {formatearNumero(fila.unidades)} u.
                                </span>
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </section>
    )
}