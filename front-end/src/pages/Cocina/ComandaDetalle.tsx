import { Alert, Spinner } from 'react-bootstrap'
import { Link, useParams } from 'react-router-dom'
import { DetalleComanda } from '../../components/Cocina/DetalleComanda'
import { useAhora } from '../../hooks/useAhora'
import { useCocinaPedidos } from '../../hooks/useCocinaPedidos'
import s from './ComandaDetalle.module.css'

// Vista individual de una comanda (se abre en pestaña nueva desde la
// gestión). No tiene acciones: sólo muestra el detalle. El backend no
// expone GET /cocina/pedidos/{id}, así que se resuelve desde la cola.
export function ComandaDetallePage() {
    const { id } = useParams<{ id: string }>()
    const pedidoId = Number(id)
    const idValido = Number.isInteger(pedidoId) && pedidoId > 0

    const { pedidos, error, cargando, recargar } = useCocinaPedidos()
    const ahora = useAhora()
    const pedido = idValido ? pedidos?.find(p => p.id === pedidoId) ?? null : null

    return (
        <div className={s.page}>
            <Link to='/cocina/comandas' className={`text-label-md ${s.volver}`}>
                <i className='bi bi-arrow-left me-1' aria-hidden='true' />
                Volver a comandas
            </Link>

            {!idValido ? (
                <Alert variant='warning' className='text-body-md mb-0'>
                    La comanda solicitada no es válida.
                </Alert>
            ) : cargando ? (
                <div className={s.centro}>
                    <Spinner animation='border' role='status'>
                        <span className='visually-hidden'>Cargando comanda…</span>
                    </Spinner>
                </div>
            ) : error ? (
                <Alert variant='danger' className='text-body-md mb-0'>
                    {error}{' '}
                    <button
                        type='button'
                        className='btn btn-link btn-sm p-0 align-baseline'
                        onClick={recargar}
                    >
                        Reintentar
                    </button>
                </Alert>
            ) : pedido ? (
                <DetalleComanda pedido={pedido} ahora={ahora} />
            ) : (
                <div className={s.fuera}>
                    <i className='bi bi-hourglass-split' aria-hidden='true' />
                    <h1 className={`text-headline-md ${s.fueraTitulo}`}>La comanda ya no está en la cola</h1>
                    <p className={`text-body-md ${s.fueraTexto}`}>
                        Puede haber sido marcada como lista o entregada por cocina.
                    </p>
                    <Link to='/cocina/comandas' className='btn btn-primary text-label-md'>
                        Volver a comandas
                    </Link>
                </div>
            )}
        </div>
    )
}
