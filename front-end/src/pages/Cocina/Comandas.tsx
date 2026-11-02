import { useMemo, useState } from 'react'
import { Alert, Button, Spinner } from 'react-bootstrap'
import { avanzarPedidoCocina } from '../../api/cocina'
import { DetalleComanda } from '../../components/Cocina/DetalleComanda'
import { EstadoComanda } from '../../components/Cocina/EstadoComanda'
import { useAhora } from '../../hooks/useAhora'
import { useCocinaPedidos } from '../../hooks/useCocinaPedidos'
import type { PedidoCocina } from '../../types/Mesa'
import { contarProductos, formatearHora, ordenarPorLlegada, tiempoTranscurrido } from '../../utils/cocina'
import s from './Comandas.module.css'

// Gestión de comandas (rol Cocina, permiso preparar_pedidos). Dos
// paneles: la cola en orden de llegada y el detalle de la seleccionada
// con SU acción (enviado → en_preparacion → listo). Al marcar listo la
// comanda sale de la cola y se recarga; el resto de los estados los
// maneja el mozo.
export function ComandasCocinaPage() {
    const { pedidos, error, cargando, recargar } = useCocinaPedidos()
    const ahora = useAhora()
    const [seleccionadoId, setSeleccionadoId] = useState<number | null>(null)
    const [accion, setAccion] = useState<number | null>(null)
    const [errorAccion, setErrorAccion] = useState<string | null>(null)

    const ordenados = useMemo(() => ordenarPorLlegada(pedidos ?? []), [pedidos])
    // Si la seleccionada salió de la cola (p. ej. al marcarla lista) se
    // deriva la primera sin setear estado en un efecto.
    const seleccionado = ordenados.find(pedido => pedido.id === seleccionadoId) ?? ordenados[0] ?? null
    const ocupado = accion !== null

    async function avanzar(pedido: PedidoCocina, estado: 'en_preparacion' | 'listo') {
        setAccion(pedido.id)
        setErrorAccion(null)
        try {
            await avanzarPedidoCocina(pedido.id, estado)
            await recargar()
        } catch (err) {
            setErrorAccion(err instanceof Error ? err.message : 'No se pudo actualizar el pedido')
        } finally {
            setAccion(null)
        }
    }

    return (
        <div className={s.page}>
            <header className={s.encabezado}>
                <div>
                    <h1 className={`text-headline-lg ${s.titulo}`}>Comandas</h1>
                    <p className={`text-body-md ${s.subtitulo}`}>
                        Pedidos que están en cocina. Avanzá cada comanda hasta marcarla lista.
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
            </header>

            <div className={s.paneles}>
                <section className={s.colaPanel} aria-label='Cola de comandas'>
                    <div className={s.colaCabecera}>
                        <h2 className={`text-headline-sm ${s.colaTitulo}`}>Cola</h2>
                        <span className={`text-label-sm ${s.contador}`}>
                            {ordenados.length} {ordenados.length === 1 ? 'comanda' : 'comandas'}
                        </span>
                    </div>

                    {cargando ? (
                        <div className={s.centro}>
                            <Spinner animation='border' role='status'>
                                <span className='visually-hidden'>Cargando comandas…</span>
                            </Spinner>
                        </div>
                    ) : ordenados.length === 0 ? (
                        <p className={`text-body-md ${s.vacio}`}>
                            {error ? 'No se pudo cargar la cola.' : 'No hay comandas en la cola.'}
                        </p>
                    ) : (
                        <ul className={s.lista}>
                            {ordenados.map(pedido => {
                                const activo = seleccionado?.id === pedido.id
                                const productos = contarProductos(pedido)
                                return (
                                    <li key={pedido.id}>
                                        <button
                                            type='button'
                                            className={activo ? `${s.item} ${s.itemActivo}` : s.item}
                                            aria-pressed={activo}
                                            onClick={() => {
                                                setSeleccionadoId(pedido.id)
                                                setErrorAccion(null)
                                            }}
                                        >
                                            <span
                                                className={
                                                    pedido.estado === 'en_preparacion'
                                                        ? `${s.barra} ${s.barraPreparacion}`
                                                        : `${s.barra} ${s.barraEnviado}`
                                                }
                                                aria-hidden='true'
                                            />
                                            <span className={s.itemCuerpo}>
                                                <span className={s.itemFila}>
                                                    <span className={`text-headline-sm ${s.itemTitulo}`}>
                                                        Pedido #{pedido.id}
                                                    </span>
                                                    <EstadoComanda estado={pedido.estado} />
                                                </span>
                                                <span className={`text-body-sm ${s.itemMeta}`}>
                                                    Mesa #{String(pedido.mesa_id).padStart(2, '0')}
                                                    {' · '}
                                                    {formatearHora(pedido.fecha)}
                                                    {pedido.fecha && ` · ${tiempoTranscurrido(pedido.fecha, ahora)}`}
                                                </span>
                                                <span className={`text-body-sm ${s.itemProductos}`}>
                                                    <i className='bi bi-basket me-1' aria-hidden='true' />
                                                    {productos} {productos === 1 ? 'producto' : 'productos'}
                                                    {accion === pedido.id && (
                                                        <Spinner size='sm' animation='border' className='ms-2' />
                                                    )}
                                                </span>
                                            </span>
                                        </button>
                                    </li>
                                )
                            })}
                        </ul>
                    )}
                </section>

                <section className={s.detallePanel} aria-label='Detalle de la comanda'>
                    {cargando ? (
                        <div className={`${s.panelVacio} ${s.panelVacioCargando}`}>
                            <Spinner animation='border' />
                        </div>
                    ) : seleccionado ? (
                        <DetalleComanda
                            pedido={seleccionado}
                            ahora={ahora}
                            acciones={
                                <>
                                    {errorAccion && (
                                        <Alert variant='danger' className='text-body-sm mb-0 w-100'>
                                            {errorAccion}
                                        </Alert>
                                    )}
                                    {seleccionado.estado === 'enviado' && (
                                        <Button
                                            variant='primary'
                                            className='text-label-md'
                                            type='button'
                                            disabled={ocupado}
                                            onClick={() => avanzar(seleccionado, 'en_preparacion')}
                                        >
                                            {accion === seleccionado.id
                                                ? <><Spinner size='sm' animation='border' className='me-1' />Empezando…</>
                                                : <><i className='bi bi-fire me-1' aria-hidden='true' />Empezar preparación</>}
                                        </Button>
                                    )}
                                    {seleccionado.estado === 'en_preparacion' && (
                                        <Button
                                            variant='primary'
                                            className='text-label-md'
                                            type='button'
                                            disabled={ocupado}
                                            onClick={() => avanzar(seleccionado, 'listo')}
                                        >
                                            {accion === seleccionado.id
                                                ? <><Spinner size='sm' animation='border' className='me-1' />Marcando…</>
                                                : <><i className='bi bi-check2-circle me-1' aria-hidden='true' />Marcar listo</>}
                                        </Button>
                                    )}
                                    <a
                                        href={`/cocina/comandas/${seleccionado.id}`}
                                        target='_blank'
                                        rel='noopener noreferrer'
                                        className='btn btn-outline-primary btn-sm text-label-md'
                                    >
                                        <i className='bi bi-box-arrow-up-right me-1' aria-hidden='true' />
                                        Abrir en pestaña
                                    </a>
                                </>
                            }
                        />
                    ) : (
                        <div className={s.panelVacio}>
                            <i className='bi bi-journal-check' aria-hidden='true' />
                            <p className='text-body-md mb-0'>
                                {error
                                    ? 'No se pudo cargar la cola de comandas.'
                                    : 'No hay comandas en la cola. Cuando llegue una, aparecerá acá.'}
                            </p>
                        </div>
                    )}
                </section>
            </div>
        </div>
    )
}
