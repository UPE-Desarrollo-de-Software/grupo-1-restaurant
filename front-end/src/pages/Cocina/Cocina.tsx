import { useEffect, useState } from 'react'
import { Alert, Button, Card, Spinner } from 'react-bootstrap'
import { avanzarPedidoCocina, getCocinaPedidos } from '../../api/cocina'
import type { PedidoCocina } from '../../types/Mesa'
import s from './Cocina.module.css'

const ETIQUETAS_ESTADO: Record<string, string> = {
    enviado: 'Para preparar',
    en_preparacion: 'En preparación',
    listo: 'Listo',
}

const formatearPrecio = (precio: number): string =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(precio)

// Tarjeta de un pedido de la cola con SU acción según el estado
// (enviado → "Empezar preparación"; en_preparacion → "Marcar listo").
// Mientras la acción corre sólo queda activo su botón (spinner) y el
// resto queda bloqueado para no disparar transiciones encadenadas.
function TarjetaCocina({
    pedido, ocupado, accion, onAccion,
}: {
    pedido: PedidoCocina
    ocupado: boolean
    accion: number | null
    onAccion: (pedido: PedidoCocina, estado: 'en_preparacion' | 'listo') => void
}) {
    const enAccion = accion === pedido.id

    return (
        <Card className={s.card}>
            <div className={s.cardHeader}>
                <span className={`text-headline-sm ${s.cardTitulo}`}>
                    Mesa #{String(pedido.mesa_id).padStart(2, '0')}
                    <span className={`text-label-sm ${s.pedidoId}`}>Pedido #{pedido.id}</span>
                </span>
                <span className={`text-label-sm ${s[pedido.estado === 'listo' ? 'badgeListo' : 'badgeEstado']}`}>
                    {ETIQUETAS_ESTADO[pedido.estado] ?? pedido.estado}
                </span>
            </div>

            <ul className={s.lineas}>
                {pedido.lineas.map(linea => (
                    <li key={linea.detalle_id} className={s.linea}>
                        <span className={`text-body-md ${s.lineaPlato}`}>
                            {linea.cantidad}× {linea.plato}
                        </span>
                        {linea.promocion && (
                            <span className={`text-body-sm ${s.promoTag}`}>{linea.promocion.nombre}</span>
                        )}
                        <span className={`text-body-sm ${s.personalizaciones}`}>
                            {[
                                ...linea.excluir.map(nombre => `Sin ${nombre}`),
                                ...linea.agregar.map(nombre => `Extra ${nombre}`),
                            ].join(' · ')}
                        </span>
                        <span className={`text-body-md ${s.lineaMonto}`}>
                            {formatearPrecio(linea.subtotal)}
                        </span>
                    </li>
                ))}
            </ul>

            <div className={s.acciones}>
                {pedido.estado === 'enviado' && (
                    <Button
                        size='sm'
                        className='text-label-md'
                        variant='primary'
                        type='button'
                        disabled={ocupado}
                        onClick={() => onAccion(pedido, 'en_preparacion')}
                    >
                        {enAccion
                            ? <><Spinner size='sm' animation='border' className='me-1' />Empezando…</>
                            : <><i className='bi bi-fire me-1' aria-hidden='true' />Empezar preparación</>}
                    </Button>
                )}
                {pedido.estado === 'en_preparacion' && (
                    <Button
                        size='sm'
                        className='text-label-md'
                        variant='primary'
                        type='button'
                        disabled={ocupado}
                        onClick={() => onAccion(pedido, 'listo')}
                    >
                        {enAccion
                            ? <><Spinner size='sm' animation='border' className='me-1' />Marcando…</>
                            : <><i className='bi bi-check2-circle me-1' aria-hidden='true' />Marcar listo</>}
                    </Button>
                )}
                {pedido.estado === 'listo' && (
                    <span className={`text-body-sm ${s.esperando}`}>
                        <i className='bi bi-bag-check me-1' aria-hidden='true' />
                        Listo para retirar: lo entrega el mozo.
                    </span>
                )}
            </div>
        </Card>
    )
}

// Cola de cocina (única pantalla del rol Cocina, permiso
// preparar_pedidos): ve los pedidos `enviado` y `en_preparacion` de
// todas las mesas y avanza SU tramo (enviado → en_preparacion →
// listo). El resto de los estados son del mozo.
export function CocinaPage() {
    const [pedidos, setPedidos] = useState<PedidoCocina[] | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [accion, setAccion] = useState<number | null>(null)
    const [errorAccion, setErrorAccion] = useState<string | null>(null)
    const [exito, setExito] = useState<string | null>(null)

    // Cola sin nonce: `pedidos === null && !error` deriva el loading
    // (regla set-state-in-effect); recargar() setea en los callbacks.
    function cargar(signal?: AbortSignal) {
        getCocinaPedidos(signal)
            .then(datos => {
                if (signal?.aborted) return
                setPedidos(datos)
                setError(null)
            })
            .catch(err => {
                if (signal?.aborted || (err instanceof DOMException && err.name === 'AbortError')) return
                setError(err instanceof Error ? err.message : 'No se pudo cargar la cola de cocina')
            })
    }

    useEffect(() => {
        const controller = new AbortController()
        cargar(controller.signal)
        return () => controller.abort()
    }, [])

    const cargando = pedidos === null && error === null
    const ocupado = accion !== null

    function recargar() {
        cargar()
    }

    async function avanzar(pedido: PedidoCocina, estado: 'en_preparacion' | 'listo') {
        setAccion(pedido.id)
        setErrorAccion(null)
        setExito(null)
        try {
            const { mensaje } = await avanzarPedidoCocina(pedido.id, estado)
            setExito(mensaje)
            recargar()
        } catch (err) {
            setErrorAccion(err instanceof Error ? err.message : 'No se pudo actualizar el pedido')
        } finally {
            setAccion(null)
        }
    }

    return (
        <div className={`${s.page} ${s.hub}`}>
            <div className={s.toolbar}>
                <div>
                    <h2 className={`text-headline-lg ${s.titulo}`}>Cocina</h2>
                    <p className={`text-body-md ${s.subtitulo}`}>
                        Pedidos enviados a cocinar. Avanzá cada uno hasta marcarlo listo.
                    </p>
                </div>
                <Button
                    size='sm'
                    variant='outline-primary'
                    className='text-label-md'
                    type='button'
                    disabled={cargando || ocupado}
                    onClick={recargar}
                >
                    <i className='bi bi-arrow-clockwise me-1' aria-hidden='true' />
                    Actualizar cola
                </Button>
            </div>

            {cargando && (
                <div className='d-flex justify-content-center py-4'>
                    <Spinner animation='border' />
                </div>
            )}

            {error && (
                <Alert variant='danger' className='text-body-md'>
                    {error}{' '}
                    <button
                        type='button'
                        className='btn btn-link btn-sm p-0 align-baseline'
                        onClick={recargar}
                    >
                        Reintentar
                    </button>
                </Alert>
            )}

            {errorAccion && <Alert variant='danger' className='text-body-md'>{errorAccion}</Alert>}
            {exito && <Alert variant='success' className='text-body-md'>{exito}</Alert>}

            {!cargando && !error && pedidos?.length === 0 && (
                <p className={`text-body-md ${s.vacio}`}>
                    No hay pedidos en la cocina ahora mismo.
                </p>
            )}

            {!cargando && !error && pedidos?.map(pedido => (
                <TarjetaCocina
                    key={pedido.id}
                    pedido={pedido}
                    ocupado={ocupado}
                    accion={accion}
                    onAccion={avanzar}
                />
            ))}
        </div>
    )
}
