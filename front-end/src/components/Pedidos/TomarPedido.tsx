import { useEffect, useState } from 'react'
import { Alert, Button, Form, Spinner } from 'react-bootstrap'
import { agregarLineas } from '../../api/pedidos'
import { getPlato, getPlatos } from '../../api/platos'
import type { PlatoListar, PlatoObtener } from '../../types/Menu'
import s from './TomarPedido.module.css'

// Toma de pedido de una mesa: plato por plato, con personalización de
// ingredientes del pivot `plato_ingrediente`:
//   por_defecto = siempre va → checkbox tildado por defecto; al
//     destildear se envía en `excluir[]`.
//   opcional sin por_defecto → checkbox destildeado por defecto; al
//     tildar se envía en `ingredientes[]` (agregar).
//   Los demás no se pueden modificar (se muestran como "incluidos").
// Sin `pedidoId` se crea una raíz nueva; con él se suman líneas a ese
// pedido (solo si está en curso, lo valida el backend con 422).

const formatearPrecio = (precio: number): string =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(precio)

interface TomarPedidoProps {
    mesaId: number
    // Pedido en curso al que se suman las líneas; null → raíz nueva.
    pedidoId?: number | null
    // Refetch del resumen de la mesa tras un alta exitosa; puede
    // esperarse con await para que el spinner cubra el refetch.
    onAlta: () => void | Promise<void>
}

export function TomarPedido({ mesaId, pedidoId, onAlta }: TomarPedidoProps) {
    const [platos, setPlatos] = useState<PlatoListar[]>([])
    const [cargando, setCargando] = useState(true)
    const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null)

    const [expandido, setExpandido] = useState<number | null>(null)
    const [detalle, setDetalle] = useState<PlatoObtener | null>(null)
    const [cargandoDetalle, setCargandoDetalle] = useState(false)
    const [errorDetalle, setErrorDetalle] = useState<string | null>(null)

    const [cantidad, setCantidad] = useState(1)
    const [checks, setChecks] = useState<Record<number, boolean>>({})

    const [enviando, setEnviando] = useState(false)
    const [errorApi, setErrorApi] = useState<string | null>(null)
    const [exito, setExito] = useState<string | null>(null)

    useEffect(() => {
        const controller = new AbortController()
        getPlatos(controller.signal)
            .then(setPlatos)
            .catch(err => {
                if (!controller.signal.aborted) {
                    setErrorBusqueda(err instanceof Error ? err.message : 'Error desconocido al cargar los platos')
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) setCargando(false)
            })
        return () => controller.abort()
    }, [])

    async function alternar(platoId: number) {
        if (expandido === platoId) {
            setExpandido(null)
            setDetalle(null)
            setErrorDetalle(null)
            return
        }
        setExpandido(platoId)
        setDetalle(null)
        setErrorDetalle(null)
        setCantidad(1)
        setCargandoDetalle(true)
        try {
            const plato = await getPlato(platoId)
            setDetalle(plato)
            const iniciales: Record<number, boolean> = {}
            for (const ing of plato.ingredientes) {
                iniciales[ing.id] = ing.pivot.por_defecto
            }
            setChecks(iniciales)
        } catch (err) {
            setErrorDetalle(err instanceof Error ? err.message : 'No se pudieron cargar los ingredientes')
        } finally {
            setCargandoDetalle(false)
        }
    }

    async function agregarAlPedido() {
        if (!detalle) return
        setEnviando(true)
        setErrorApi(null)
        setExito(null)
        const ingredientes: number[] = []
        const excluir: number[] = []
        for (const ing of detalle.ingredientes) {
            const tildado = checks[ing.id] ?? ing.pivot.por_defecto
            if (ing.pivot.por_defecto) {
                if (!tildado) excluir.push(ing.id)
            } else if (ing.pivot.opcional && tildado) {
                ingredientes.push(ing.id)
            }
        }
        try {
            const { mensaje } = await agregarLineas(mesaId, {
                platos: [{
                    plato_id: detalle.id,
                    cantidad,
                    ...(ingredientes.length > 0 ? { ingredientes } : {}),
                    ...(excluir.length > 0 ? { excluir } : {}),
                }],
                ...(pedidoId != null ? { pedido_id: pedidoId } : {}),
            })
            setExito(`${mensaje} (${cantidad}× ${detalle.nombre})`)
            setExpandido(null)
            setDetalle(null)
            setCantidad(1)
            await onAlta()
        } catch (err) {
            setErrorApi(err instanceof Error ? err.message : 'No se pudo agregar el plato al pedido')
        } finally {
            setEnviando(false)
        }
    }

    // Subtotal estimado: precio base + adicionales tildados (el descuento
    // de promos lo calcula el backend al confirmar).
    const subtotal = detalle
        ? (detalle.precio
            + detalle.ingredientes
                .filter(ing => (checks[ing.id] ?? ing.pivot.por_defecto) && ing.pivot.opcional && !ing.pivot.por_defecto)
                .reduce((acum, ing) => acum + ing.precioAdicional, 0))
        * cantidad
        : 0

    return (
        <section className={s.card}>
            <h3 className={`text-headline-sm ${s.titulo}`}>
                <i className='bi bi-cart-plus me-2' aria-hidden='true' />
                Tomar pedido
            </h3>
            <p className={`text-body-sm ${s.destino}`}>
                {pedidoId != null
                    ? <>Agregando líneas al <strong>pedido #{pedidoId}</strong> (en curso).</>
                    : <>Sin pedido en curso: se creará una <strong>raíz nueva</strong>.</>}
            </p>

            {exito && <Alert variant='success' className='text-body-sm'>{exito}</Alert>}
            {errorApi && <Alert variant='danger' className='text-body-sm'>{errorApi}</Alert>}

            {cargando && (
                <div className={s.cargando}>
                    <Spinner animation='border' size='sm' />
                    <span className='text-body-md'>Cargando platos…</span>
                </div>
            )}
            {errorBusqueda && <Alert variant='danger' className='text-body-sm'>{errorBusqueda}</Alert>}

            {!cargando && !errorBusqueda && (
                <ul className={s.platos}>
                    {platos.filter(p => p.disponible).map(plato => (
                        <li key={plato.id} className={s.platoFila}>
                            <div className={s.platoInfo}>
                                <span className={`text-body-md ${s.platoNombre}`}>{plato.nombre}</span>
                                {plato.promocion && (
                                    <span className={s.promoTag}>{plato.promocion.nombre}</span>
                                )}
                                <span className={`text-body-sm ${s.platoPrecio}`}>
                                    {formatearPrecio(plato.precio)}
                                </span>
                            </div>
                            <Button
                                size='sm'
                                variant={expandido === plato.id ? 'primary' : 'outline-primary'}
                                className='text-label-md'
                                onClick={() => alternar(plato.id)}
                            >
                                <i className={`bi ${expandido === plato.id ? 'bi-x-lg' : 'bi-sliders'} me-1`} aria-hidden='true' />
                                {expandido === plato.id ? 'Cerrar' : 'Personalizar'}
                            </Button>

                            {expandido === plato.id && (
                                <div className={s.panel}>
                                    {cargandoDetalle && (
                                        <div className={s.cargando}>
                                            <Spinner animation='border' size='sm' />
                                            <span className='text-body-sm'>Cargando ingredientes…</span>
                                        </div>
                                    )}
                                    {errorDetalle && (
                                        <Alert variant='warning' className='text-body-sm'>{errorDetalle}</Alert>
                                    )}

                                    {detalle && !cargandoDetalle && (
                                        <>
                                            <Form.Group controlId={`cantidad-${detalle.id}`} className={s.cantidadGrupo}>
                                                <Form.Label className='text-label-md'>Cantidad</Form.Label>
                                                <Form.Control
                                                    type='number'
                                                    min={1}
                                                    className={s.cantidadInput}
                                                    value={cantidad}
                                                    onChange={e => setCantidad(Math.max(1, Number(e.target.value) || 1))}
                                                />
                                            </Form.Group>

                                            {detalle.ingredientes.length > 0 && (
                                                <div className={s.ingredientes}>
                                                    <span className={`text-label-md ${s.ingredientesTitulo}`}>Ingredientes</span>
                                                    {detalle.ingredientes.map(ing => {
                                                        const modifiable = ing.pivot.por_defecto || ing.pivot.opcional
                                                        if (!modifiable) {
                                                            return (
                                                                <span key={ing.id} className={`text-body-sm ${s.ingredienteFijo}`}>
                                                                    <i className='bi bi-check2' aria-hidden='true' />
                                                                    {ing.nombre} (incluido)
                                                                </span>
                                                            )
                                                        }
                                                        const tildado = checks[ing.id] ?? ing.pivot.por_defecto
                                                        const esAgregar = ing.pivot.opcional && !ing.pivot.por_defecto
                                                        return (
                                                            <Form.Check
                                                                key={ing.id}
                                                                type='checkbox'
                                                                id={`ing-${detalle.id}-${ing.id}`}
                                                                className={`text-body-sm ${s.ingredienteCheck}`}
                                                                checked={tildado}
                                                                label={
                                                                    <>
                                                                        {ing.nombre}
                                                                        {esAgregar && ing.precioAdicional > 0 && (
                                                                            <span className={s.adicional}>
                                                                                + {formatearPrecio(ing.precioAdicional)}
                                                                            </span>
                                                                        )}
                                                                        {!esAgregar && (
                                                                            <span className={s.adicional}>quitar</span>
                                                                        )}
                                                                    </>
                                                                }
                                                                onChange={e => setChecks(prev => ({ ...prev, [ing.id]: e.target.checked }))}
                                                            />
                                                        )
                                                    })}
                                                </div>
                                            )}

                                            <div className={s.panelPie}>
                                                <span className='text-price-display'>{formatearPrecio(subtotal)}</span>
                                                <Button
                                                    size='sm'
                                                    variant='primary'
                                                    className='text-label-md'
                                                    disabled={enviando}
                                                    onClick={agregarAlPedido}
                                                >
                                                    {enviando
                                                        ? <><Spinner size='sm' animation='border' className='me-1' />Agregando…</>
                                                        : <><i className='bi bi-plus-lg me-1' aria-hidden='true' />Agregar al pedido</>}
                                                </Button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </section>
    )
}
