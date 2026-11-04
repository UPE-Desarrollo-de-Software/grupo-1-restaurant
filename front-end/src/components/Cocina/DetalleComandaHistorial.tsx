import type { ComandaHistorial } from '../../types/Historial'
import {
    contarProductosHistorial,
    etiquetaMesaHistorial,
    formatearFechaHora,
    formatearPrecio,
} from '../../utils/historial'
import { EstadoComanda } from './EstadoComanda'
import s from './DetalleComandaHistorial.module.css'

// Detalle de una comanda del historial: sólo lectura, sin ingredientes ni
// personalizaciones porque GET /historial/comandas no las devuelve.
export function DetalleComandaHistorial({ comanda }: { comanda: ComandaHistorial }) {
    const totalProductos = contarProductosHistorial(comanda)

    return (
        <article className={s.panel} aria-label={`Comanda histórica del pedido ${comanda.id}`}>
            <header className={s.header}>
                <div className={s.identidad}>
                    <span className={`text-label-md ${s.mesa}`}>
                        {etiquetaMesaHistorial(comanda.mesa)}
                    </span>
                    <h2 className={`text-headline-lg ${s.titulo}`}>Pedido #{comanda.id}</h2>
                    {comanda.pedido_padre_id !== null && (
                        <span className={`text-body-sm ${s.anexo}`}>
                            Anexo del pedido #{comanda.pedido_padre_id}
                        </span>
                    )}
                </div>
                <div className={s.meta}>
                    <EstadoComanda estado={comanda.estado} />
                    <span className={`text-body-sm ${s.dato}`}>
                        <i className='bi bi-calendar3 me-1' aria-hidden='true' />
                        {formatearFechaHora(comanda.fecha)}
                    </span>
                    <span className={`text-body-sm ${s.dato}`}>
                        <i className='bi bi-basket me-1' aria-hidden='true' />
                        {totalProductos} {totalProductos === 1 ? 'plato' : 'platos'}
                    </span>
                </div>
            </header>

            {comanda.lineas.length === 0 ? (
                <p className={`text-body-md ${s.vacio}`}>La comanda no tiene líneas.</p>
            ) : (
                <ul className={s.lineas}>
                    {comanda.lineas.map(linea => (
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
                                <span className={`text-body-sm ${s.unitario}`}>
                                    Unitario: {formatearPrecio(linea.precio_lista)}
                                </span>
                                {!linea.confirmado && (
                                    <span className={`text-label-sm ${s.sinConfirmar}`}>
                                        Sin confirmar
                                    </span>
                                )}
                            </div>
                            <span className={`text-body-md ${s.monto}`}>
                                {formatearPrecio(linea.subtotal)}
                            </span>
                        </li>
                    ))}
                </ul>
            )}

            <footer className={s.total}>
                <span className='text-label-md'>Total</span>
                <span className={`text-headline-md ${s.totalMonto}`}>
                    {formatearPrecio(comanda.total)}
                </span>
            </footer>
        </article>
    )
}
