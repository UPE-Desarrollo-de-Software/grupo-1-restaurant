import type { ReactNode } from 'react'
import type { PedidoCocina } from '../../types/Mesa'
import { useIngredientesComanda } from '../../hooks/useIngredientesComanda'
import {
    composicionLinea,
    contarProductos,
    ETIQUETAS_COMPOSICION,
    formatearHora,
    ingredientesExcluidos,
    tiempoTranscurrido,
} from '../../utils/cocina'
import type { EstadoIngredienteComposicion } from '../../utils/cocina'
import { EstadoComanda } from './EstadoComanda'
import s from './DetalleComanda.module.css'

const formatearPrecio = (precio: number): string =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(precio)

const CLASE_ESTADO: Record<EstadoIngredienteComposicion, string> = {
    obligatorio: s.estadoObligatorio,
    por_defecto: s.estadoPorDefecto,
    extra: s.estadoExtra,
}

interface DetalleComandaProps {
    pedido: PedidoCocina
    ahora: Date
    acciones?: ReactNode
}

// Detalle de una comanda, compartido por la gestión (panel derecho) y
// la vista individual (pantalla completa). Muestra la composición final
// de cada plato (receta + personalizaciones), no la receta completa. No
// muestra aclaraciones porque el backend no las guarda.
export function DetalleComanda({ pedido, ahora, acciones }: DetalleComandaProps) {
    const totalProductos = contarProductos(pedido)
    const { recetas, fallidos, reintentar } = useIngredientesComanda(pedido.lineas)
    const hayRecetaFallida = pedido.lineas.some(linea => fallidos.has(linea.plato_id))

    return (
        <article className={s.panel} aria-label={`Comanda del pedido ${pedido.id}`}>
            <header className={s.header}>
                <div className={s.identidad}>
                    <span className={`text-label-md ${s.mesa}`}>
                        Mesa #{String(pedido.mesa_id).padStart(2, '0')}
                    </span>
                    <h2 className={`text-headline-lg ${s.titulo}`}>Pedido #{pedido.id}</h2>
                </div>
                <div className={s.meta}>
                    <EstadoComanda estado={pedido.estado} />
                    <span className={`text-body-sm ${s.hora}`}>
                        <i className='bi bi-clock me-1' aria-hidden='true' />
                        {formatearHora(pedido.fecha)}
                        {pedido.fecha && ` · ${tiempoTranscurrido(pedido.fecha, ahora)}`}
                    </span>
                    <span className={`text-body-sm ${s.productos}`}>
                        <i className='bi bi-basket me-1' aria-hidden='true' />
                        {totalProductos} {totalProductos === 1 ? 'plato' : 'platos'}
                    </span>
                </div>
            </header>

            {pedido.lineas.length === 0 ? (
                <p className={`text-body-md ${s.vacio}`}>La comanda no tiene líneas.</p>
            ) : (
                <>
                    <ul className={s.lineas}>
                        {pedido.lineas.map(linea => {
                            const receta = recetas[linea.plato_id]
                            const composicion = composicionLinea(linea, receta)
                            const excluidos = ingredientesExcluidos(linea)
                            const recetaFallida = fallidos.has(linea.plato_id)
                            const platoSinId = linea.plato_id <= 0

                            return (
                                <li key={linea.detalle_id} className={s.linea}>
                                    <span className={`text-headline-md ${s.cantidad}`}>{linea.cantidad}×</span>
                                    <div className={s.datos}>
                                        <span className={`text-headline-sm ${s.plato}`}>{linea.plato}</span>
                                        {linea.promocion && (
                                            <span className={`text-body-sm ${s.promo}`}>
                                                <i className='bi bi-tag me-1' aria-hidden='true' />
                                                {linea.promocion.nombre}
                                            </span>
                                        )}
                                        <div className={s.composicion}>
                                            <span className={`text-label-sm ${s.composicionTitulo}`}>Ingredientes</span>
                                            {!receta && (
                                                <p className={`text-body-sm ${s.ingredientesAviso}`}>
                                                    {platoSinId
                                                        ? 'Ingredientes no disponibles.'
                                                        : recetaFallida
                                                            ? 'No se pudo cargar la receta.'
                                                            : 'Cargando ingredientes…'}
                                                </p>
                                            )}
                                            {composicion.length > 0 ? (
                                                <ul className={s.ingredientesLista}>
                                                    {composicion.map((ingrediente, indice) => (
                                                        <li
                                                            key={`composicion-${ingrediente.id}-${indice}`}
                                                            className={`text-body-sm ${s.ingrediente}`}
                                                        >
                                                            <span>{ingrediente.nombre}</span>
                                                            <span
                                                                className={`text-label-sm ${s.estadoIngrediente} ${CLASE_ESTADO[ingrediente.estado]}`}
                                                            >
                                                                {ETIQUETAS_COMPOSICION[ingrediente.estado]}
                                                            </span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : receta ? (
                                                <p className={`text-body-sm ${s.ingredientesAviso}`}>Sin ingredientes.</p>
                                            ) : null}
                                            {excluidos.length > 0 && (
                                                <p className={`text-body-sm ${s.sin}`}>Sin {excluidos.join(', ')}</p>
                                            )}
                                        </div>
                                    </div>
                                    <span className={`text-body-md ${s.monto}`}>{formatearPrecio(linea.subtotal)}</span>
                                </li>
                            )
                        })}
                    </ul>
                    {hayRecetaFallida && (
                        <button
                            type='button'
                            className={`btn btn-link btn-sm p-0 text-label-sm ${s.reintentar}`}
                            onClick={reintentar}
                        >
                            <i className='bi bi-arrow-clockwise me-1' aria-hidden='true' />
                            Reintentar ingredientes
                        </button>
                    )}
                </>
            )}

            {acciones && <footer className={s.acciones}>{acciones}</footer>}
        </article>
    )
}
