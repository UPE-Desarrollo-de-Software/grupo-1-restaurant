import { useEffect, useState } from 'react'
import { Alert, Badge, Button, Spinner } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import { getCuentaCliente, llamarMozo } from '../../api/cliente'
import { useCliente } from '../../context/ClienteContext/useCliente'
import type { LineaBorrador } from '../../types/Cliente'
import type { EstadoPedido, ParteCuenta, PedidoResumen } from '../../types/Mesa'
import { importeLinea, unitarioLinea } from '../../utils/borrador'
import { ConfirmacionModal } from '../../components/Cliente/ConfirmacionModal'
import { PersonalizarPlatoModal } from '../../components/Cliente/PersonalizarPlatoModal'
import s from './PedidoPage.module.css'

type Vista = 'pedido' | 'cuenta'

const formatearPrecio = (precio: number): string =>
    new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0,
    }).format(precio)

const COLOR_ESTADO: Record<EstadoPedido, string> = {
    en_curso: 'warning',
    confirmado: 'info',
    enviado: 'primary',
    en_preparacion: 'secondary',
    listo: 'primary',
    entregado: 'success',
    cerrado: 'dark',
    cancelado: 'danger',
}

function formatearFecha(fecha: string): string {
    const fechaDate = new Date(fecha.replace(' ', 'T'))
    if (Number.isNaN(fechaDate.getTime())) return fecha
    return fechaDate.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
}

// No se exporta: react-refresh/only-export-components.
function BloqueParte({ parte, indice, esMia }: { parte: ParteCuenta; indice: number; esMia: boolean }) {
    return (
        <article className={esMia ? `${s.parte} ${s.parteMia}` : s.parte}>
            <header className={s.parteHeader}>
                <span className='text-body-md'>Parte {indice + 1}</span>
                {esMia && <Badge bg='primary' className='text-label-sm'>Tu parte</Badge>}
            </header>
            <ul className={s.parteLineas}>
                {parte.lineas.map(linea => (
                    <li key={linea.detalle_id} className={s.parteLinea}>
                        <span className={s.parteLineaInfo}>
                            <span>{linea.cantidad} × {linea.plato}</span>
                            {linea.promocion && <span className={s.promoTag}>{linea.promocion.nombre}</span>}
                            {linea.descuento > 0 && <span className={s.descuento}>− {formatearPrecio(linea.descuento)}</span>}
                        </span>
                        <span className={s.parteLineaSubtotal}>{formatearPrecio(linea.subtotal)}</span>
                    </li>
                ))}
            </ul>
            <div className={s.parteSubtotal}>
                <span className='text-label-md'>Subtotal de la parte</span>
                <span className='text-price-display'>{formatearPrecio(parte.subtotal)}</span>
            </div>
        </article>
    )
}

// Mi pedido (cliente, público): vista con el borrador editable que aún
// NO se envió (editar / eliminar / cancelar / enviar) + pedidos ya
// enviados en solo lectura, y vista Cuenta con el total de la visita
// (GET /cliente/cuenta). Enviar = crear/confirmar vía API (POST
// /cliente/pedidos + /confirmar); el paso final a cocina lo da el mozo.
export function PedidoPage() {
    const {
        mesa, mesaIdentificada, revalidando,
        borrador, cantidadBorrador, totalBorrador,
        pedidoIds, resumen, recargarResumen,
        eliminarLinea, cancelarBorrador, enviar,
    } = useCliente()

    const [vista, setVista] = useState<Vista>('pedido')
    const [cuenta, setCuenta] = useState<Awaited<ReturnType<typeof getCuentaCliente>> | null>(null)
    const [errorCuenta, setErrorCuenta] = useState<string | null>(null)
    const [nonceCuenta, setNonceCuenta] = useState(0)
    const [lineaAEditar, setLineaAEditar] = useState<LineaBorrador | null>(null)
    const [mostrarCancelar, setMostrarCancelar] = useState(false)
    const [mostrarEnviar, setMostrarEnviar] = useState(false)
    const [enviando, setEnviando] = useState(false)
    const [errorEnvio, setErrorEnvio] = useState<string | null>(null)
    const [exitoEnvio, setExitoEnvio] = useState<string | null>(null)
    const [errorResumen, setErrorResumen] = useState<string | null>(null)
    // "Llamar al mozo" (POST /cliente/llamar): tras un aviso exitoso el
    // botón queda deshabilitado (el back sólo acepta 1 cada 60 s por
    // mesa y responde 429 con mensaje en español si se repite).
    const [avisando, setAvisando] = useState(false)
    const [avisoEnviado, setAvisoEnviado] = useState(false)
    const [errorAviso, setErrorAviso] = useState<string | null>(null)

    // Pedidos enviados por ESTE comensal (el resumen trae todos los de
    // la mesa, incluidos los de otros comensales en sesiones de grupo).
    useEffect(() => {
        if (!mesaIdentificada || pedidoIds.length === 0) return
        let cancelado = false
        async function cargar() {
            try {
                await recargarResumen()
                if (!cancelado) setErrorResumen(null)
            } catch (err) {
                if (!cancelado) {
                    setErrorResumen(err instanceof Error ? err.message : 'No se pudieron cargar tus pedidos enviados')
                }
            }
        }
        cargar()
        return () => { cancelado = true }
    }, [mesaIdentificada, pedidoIds, recargarResumen])

    // Cuenta de la visita: solo se pide al abrir la pestaña (y al
    // reintentar vía nonceCuenta). El estado de carga se deriva.
    useEffect(() => {
        if (vista !== 'cuenta' || !mesa) return
        const controller = new AbortController()
        let cancelado = false
        getCuentaCliente(mesa.codigo_acceso, controller.signal)
            .then(data => {
                if (!cancelado) {
                    setCuenta(data)
                    setErrorCuenta(null)
                }
            })
            .catch(err => {
                if (cancelado || (err instanceof DOMException && err.name === 'AbortError')) return
                setCuenta(null)
                setErrorCuenta(err instanceof Error ? err.message : 'No se pudo cargar la cuenta de la mesa')
            })
        return () => {
            cancelado = true
            controller.abort()
        }
    }, [vista, mesa, nonceCuenta])

    const hayPedidosEnviados = pedidoIds.length > 0
    const cargandoResumen = hayPedidosEnviados && resumen === null && errorResumen === null
    const misPedidos = resumen
        ? resumen.pedidos.filter((pedido: PedidoResumen) => pedidoIds.includes(pedido.id))
        : []
    const cargandoCuenta = vista === 'cuenta' && cuenta === null && errorCuenta === null

    function reintentarCuenta() {
        setCuenta(null)
        setErrorCuenta(null)
        setNonceCuenta(n => n + 1)
    }

    async function confirmarEnvio() {
        setEnviando(true)
        setErrorEnvio(null)
        try {
            await enviar()
            setMostrarEnviar(false)
            setExitoEnvio('Tu pedido fue enviado. Lo vas a ver en «Pedidos enviados».')
        } catch (err) {
            // El borrador queda intacto para reintentar desde el modal.
            setErrorEnvio(err instanceof Error ? err.message : 'No se pudo enviar el pedido. Probá de nuevo.')
        } finally {
            setEnviando(false)
        }
    }

    async function pedirAtencion() {
        if (!mesa?.codigo_acceso || avisando || avisoEnviado) return
        setAvisando(true)
        setErrorAviso(null)
        try {
            await llamarMozo(mesa.codigo_acceso)
            // Éxito: el botón queda deshabilitado (el back sólo acepta
            // 1 aviso cada 60 s por mesa; 429 en el reintento).
            setAvisoEnviado(true)
        } catch (err) {
            setErrorAviso(err instanceof Error ? err.message : 'No se pudo avisar al mozo. Probá de nuevo.')
        } finally {
            setAvisando(false)
        }
    }

    // Revalidación inicial del código guardado: no mostrar nada antes.
    if (revalidando) {
        return (
            <div className={s.pagina}>
                <div className={s.cargandoGlobal}>
                    <Spinner animation='border' size='sm' />
                    <span className='text-body-md'>Verificando tu mesa…</span>
                </div>
            </div>
        )
    }

    // Sin mesa identificada no hay pedido posible.
    if (!mesaIdentificada) {
        return (
            <div className={s.pagina}>
                <section className={s.vacio}>
                    <i className={`bi bi-upc-scan ${s.vacioIcono}`} aria-hidden='true' />
                    <h1 className='text-headline-md'>Tu pedido en mesa</h1>
                    <p className={`text-body-md ${s.vacioTexto}`}>
                        Para ver y armar tu pedido necesitás identificar la mesa con el código de
                        4 dígitos que te dio tu mozo.
                    </p>
                    <div className={s.vacioAcciones}>
                        <Link to='/mesa' className='btn btn-primary text-label-md'>Ingresar código de mesa</Link>
                        <Link to='/carta' className='btn btn-outline-secondary text-label-md'>Ver la Carta</Link>
                    </div>
                </section>
            </div>
        )
    }

    return (
        <div className={s.pagina}>
            <header className={s.encabezado}>
                <h1 className='text-headline-md'>Mi pedido</h1>
                <div className={s.encabezadoAcciones}>
                    <span className={`text-label-md ${s.mesa}`}>
                        <i className='bi bi-table me-1' aria-hidden='true' />
                        Mesa {mesa?.id}
                    </span>
                    <Button
                        size='sm'
                        className='text-label-md'
                        variant={avisoEnviado ? 'success' : 'outline-secondary'}
                        type='button'
                        disabled={!mesaIdentificada || avisando || avisoEnviado}
                        title={avisoEnviado ? 'Ya avisaste al mozo en los últimos segundos' : undefined}
                        onClick={pedirAtencion}
                    >
                        {avisando
                            ? <><Spinner size='sm' animation='border' className='me-1' />Avisando…</>
                            : avisoEnviado
                                ? <><i className='bi bi-check2-circle me-1' aria-hidden='true' />Mozo avisado</>
                                : <><i className='bi bi-bell me-1' aria-hidden='true' />Llamar al mozo</>}
                    </Button>
                </div>
            </header>

            {errorAviso && (
                <Alert variant='warning' className='text-body-md' dismissible onClose={() => setErrorAviso(null)}>
                    {errorAviso}
                </Alert>
            )}

            <div className={s.vistaToggle}>
                <Button
                    size='sm'
                    className='text-label-md'
                    variant={vista === 'pedido' ? 'primary' : 'outline-primary'}
                    type='button'
                    onClick={() => setVista('pedido')}
                >
                    Mi pedido
                </Button>
                <Button
                    size='sm'
                    className='text-label-md'
                    variant={vista === 'cuenta' ? 'primary' : 'outline-primary'}
                    type='button'
                    onClick={() => setVista('cuenta')}
                >
                    Cuenta
                </Button>
            </div>

            {vista === 'pedido' && exitoEnvio && (
                <Alert variant='success' className='text-body-md' dismissible onClose={() => setExitoEnvio(null)}>
                    {exitoEnvio}
                </Alert>
            )}

            {/* ==== Vista: Mi pedido ==== */}
            {vista === 'pedido' && (
                <>
                    {/* Borrador (todavía NO enviado) */}
                    <section className={s.seccion} aria-labelledby='borrador-title'>
                        <div className={s.seccionTitulo}>
                            <h2 id='borrador-title' className='text-headline-sm'>Pedido en curso</h2>
                            {borrador.length > 0 && (
                                <Badge bg='primary' pill className='text-label-sm'>
                                    {cantidadBorrador} {cantidadBorrador === 1 ? 'plato' : 'platos'}
                                </Badge>
                            )}
                        </div>

                        {borrador.length === 0 ? (
                            <div className={s.vacio}>
                                <i className={`bi bi-basket ${s.vacioIcono}`} aria-hidden='true' />
                                <p className='text-body-md'>Tu pedido está vacío.</p>
                                <Link to='/carta' className='btn btn-primary text-label-md'>Ver la Carta</Link>
                            </div>
                        ) : (
                            <>
                                <ul className={s.lista}>
                                    {borrador.map(linea => (
                                        <li key={linea.clave} className={s.item}>
                                            <div className={s.itemMedia}>
                                                {linea.plato.imagen
                                                    ? <img className={s.itemImagen} src={linea.plato.imagen} alt='' />
                                                    : <i className={`bi bi-image ${s.itemImagenIcono}`} aria-hidden='true' />}
                                            </div>

                                            <div className={s.itemCuerpo}>
                                                <div className={s.itemFila}>
                                                    <span className={`text-body-md ${s.itemNombre}`}>
                                                        {linea.plato.nombre}
                                                    </span>
                                                    <span className={`text-label-md ${s.itemSubtotal}`}>
                                                        {formatearPrecio(importeLinea(linea))}
                                                    </span>
                                                </div>

                                                <div className={s.itemFila}>
                                                    <span className={`text-body-sm ${s.itemDetalle}`}>
                                                        {linea.cantidad} × {formatearPrecio(unitarioLinea(linea))}
                                                    </span>
                                                </div>

                                                {(linea.ingredientes.length > 0 || linea.excluir.length > 0) && (
                                                    <p className={`text-body-sm ${s.itemOpciones}`}>
                                                        {linea.excluir.length > 0 && (
                                                            <>
                                                                Sin {linea.excluir.map(id => linea.opciones[id]?.nombre).filter(Boolean).join(', ')}
                                                                {linea.ingredientes.length > 0 && ' · '}
                                                            </>
                                                        )}
                                                        {linea.ingredientes.length > 0 && (
                                                            <>Con {linea.ingredientes.map(id => linea.opciones[id]?.nombre).filter(Boolean).join(', ')}</>
                                                        )}
                                                    </p>
                                                )}

                                                <div className={s.itemAcciones}>
                                                    <Button
                                                        type='button'
                                                        variant='link'
                                                        size='sm'
                                                        className={`text-label-sm ${s.accionEditar}`}
                                                        onClick={() => setLineaAEditar(linea)}
                                                    >
                                                        <i className='bi bi-pencil me-1' aria-hidden='true' />
                                                        Editar
                                                    </Button>
                                                    <Button
                                                        type='button'
                                                        variant='link'
                                                        size='sm'
                                                        className={`text-label-sm ${s.accionEliminar}`}
                                                        onClick={() => eliminarLinea(linea.clave)}
                                                    >
                                                        <i className='bi bi-trash me-1' aria-hidden='true' />
                                                        Eliminar
                                                    </Button>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>

                                <div className={s.totalFila}>
                                    <span className='text-body-md'>Total estimado</span>
                                    <span className='text-price-display'>{formatearPrecio(totalBorrador)}</span>
                                </div>

                                <div className={s.enviarFila}>
                                    <Button
                                        type='button'
                                        variant='outline-danger'
                                        className='text-label-md'
                                        onClick={() => setMostrarCancelar(true)}
                                    >
                                        Cancelar pedido
                                    </Button>
                                    <Button
                                        type='button'
                                        variant='primary'
                                        className='text-label-md'
                                        onClick={() => {
                                            setErrorEnvio(null)
                                            setMostrarEnviar(true)
                                        }}
                                    >
                                        <i className='bi bi-send me-1' aria-hidden='true' />
                                        Enviar pedido
                                    </Button>
                                </div>
                            </>
                        )}
                    </section>

                    {/* Pedidos ya enviados (solo lectura) */}
                    {hayPedidosEnviados && (
                        <section className={s.seccion} aria-labelledby='enviados-title'>
                            <div className={s.seccionTitulo}>
                                <h2 id='enviados-title' className='text-headline-sm'>Pedidos enviados</h2>
                            </div>

                            {cargandoResumen && (
                                <div className={s.cargandoGlobal}>
                                    <Spinner animation='border' size='sm' />
                                    <span className='text-body-md'>Cargando tus pedidos…</span>
                                </div>
                            )}

                            {errorResumen && (
                                <Alert variant='danger' className='text-body-md'>
                                    {errorResumen}{' '}
                                    <button
                                        type='button'
                                        className={`btn btn-link btn-sm p-0 align-baseline ${s.reintentar}`}
                                        onClick={() => {
                                            setErrorResumen(null)
                                            recargarResumen().catch((err: unknown) => {
                                                setErrorResumen(err instanceof Error ? err.message : 'No se pudieron cargar tus pedidos enviados')
                                            })
                                        }}
                                    >
                                        Reintentar
                                    </button>
                                </Alert>
                            )}

                            {!cargandoResumen && !errorResumen && misPedidos.length === 0 && (
                                <p className={`text-body-md ${s.vacioTexto}`}>
                                    Todavía no enviaste pedidos desde esta pantalla.
                                </p>
                            )}

                            {!cargandoResumen && !errorResumen && misPedidos.map(pedido => (
                                <article key={pedido.id} className={s.pedidoEnviado}>
                                    <header className={s.pedidoEncabezado}>
                                        <span className='text-body-md'>Pedido #{pedido.id}</span>
                                        <Badge bg={COLOR_ESTADO[pedido.estado as EstadoPedido] ?? 'secondary'} className='text-label-sm'>
                                            {pedido.estado.replace('_', ' ')}
                                        </Badge>
                                    </header>
                                    <span className={`text-body-sm ${s.pedidoFecha}`}>{formatearFecha(pedido.fecha)}</span>

                                    <ul className={s.pedidoLineas}>
                                        {pedido.lineas.map(linea => (
                                            <li key={linea.detalle_id} className={`text-body-sm ${s.pedidoLinea}`}>
                                                <span>
                                                    {linea.cantidad} × {linea.plato}
                                                </span>
                                                <span className={s.pedidoLineaSubtotal}>
                                                    {formatearPrecio(linea.subtotal)}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>

                                    <div className={s.pedidoTotal}>
                                        <span className='text-body-md'>Total</span>
                                        <span className='text-price-display'>{formatearPrecio(pedido.total)}</span>
                                    </div>
                                </article>
                            ))}
                        </section>
                    )}
                </>
            )}

            {/* ==== Vista: Cuenta ==== */}
            {vista === 'cuenta' && (
                <section className={s.seccion} aria-labelledby='cuenta-title'>
                    <div className={s.seccionTitulo}>
                        <h2 id='cuenta-title' className='text-headline-sm'>Cuenta de la mesa</h2>
                    </div>

                    {cargandoCuenta && (
                        <div className={s.cargandoGlobal}>
                            <Spinner animation='border' size='sm' />
                            <span className='text-body-md'>Cargando la cuenta…</span>
                        </div>
                    )}

                    {errorCuenta && (
                        <Alert variant='danger' className='text-body-md'>
                            {errorCuenta}{' '}
                            <button
                                type='button'
                                className={`btn btn-link btn-sm p-0 align-baseline ${s.reintentar}`}
                                onClick={reintentarCuenta}
                            >
                                Reintentar
                            </button>
                        </Alert>
                    )}

                    {cuenta && (
                        <>
                            <div className={s.totalBox}>
                                <p className={`text-label-md ${s.totalEtiqueta}`}>
                                    Total de la visita
                                    {cuenta.ocupada_desde && ` · desde ${formatearFecha(cuenta.ocupada_desde)}`}
                                </p>
                                <p className='text-price-display'>{formatearPrecio(cuenta.total)}</p>
                            </div>

                            {cuenta.partes.length === 0 ? (
                                <p className={`text-body-md text-center ${s.vacioTexto}`}>
                                    Sin pedidos en esta visita todavía.
                                </p>
                            ) : (
                                cuenta.partes.map((parte, indice) => (
                                    <BloqueParte
                                        key={parte.pedido_id}
                                        parte={parte}
                                        indice={indice}
                                        esMia={parte.pedido_ids.some(id => pedidoIds.includes(id))}
                                    />
                                ))
                            )}

                            {cuenta.grupo && cuenta.grupo.length > 0 && (
                                <div className={s.grupoSeccion}>
                                    <h3 className='text-headline-sm'>Mesas del grupo</h3>
                                    {cuenta.grupo.map(hermana => (
                                        <div key={hermana.mesa_id} className={s.grupoMesa}>
                                            <div className={s.grupoHeader}>
                                                <span className='text-headline-sm'>Mesa #{hermana.mesa_id}</span>
                                                <span className='text-price-display'>{formatearPrecio(hermana.total)}</span>
                                            </div>
                                            {hermana.partes.map((parte, indice) => (
                                                <BloqueParte key={parte.pedido_id} parte={parte} indice={indice} esMia={false} />
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </section>
            )}

            {/* ==== Modales ==== */}
            <PersonalizarPlatoModal
                show={lineaAEditar !== null}
                plato={null}
                lineaInicial={lineaAEditar}
                onCerrar={() => setLineaAEditar(null)}
            />

            <ConfirmacionModal
                show={mostrarCancelar}
                titulo='Cancelar pedido'
                textoConfirmar='Sí, cancelar'
                textoCancelar='Volver al pedido'
                varianteConfirmar='danger'
                onConfirmar={() => {
                    cancelarBorrador()
                    setMostrarCancelar(false)
                }}
                onCancelar={() => setMostrarCancelar(false)}
            >
                <p className='text-body-md mb-0'>
                    Se van a eliminar todos los platos de tu pedido en curso. Esta acción no se
                    puede deshacer y no afecta los pedidos que ya enviaste.
                </p>
            </ConfirmacionModal>

            <ConfirmacionModal
                show={mostrarEnviar}
                titulo='Enviar pedido'
                textoConfirmar='Confirmar envío'
                textoCancelar='Volver al pedido'
                confirmarCargando={enviando}
                error={errorEnvio}
                onConfirmar={confirmarEnvio}
                onCancelar={() => {
                    if (enviando) return
                    setMostrarEnviar(false)
                    setErrorEnvio(null)
                }}
            >
                <ul className={s.resumenEnvio}>
                    {borrador.map(linea => (
                        <li key={linea.clave} className={`text-body-sm ${s.resumenEnvioItem}`}>
                            <span>{linea.cantidad} × {linea.plato.nombre}</span>
                            <span>{formatearPrecio(importeLinea(linea))}</span>
                        </li>
                    ))}
                </ul>
                <div className={s.resumenEnvioTotal}>
                    <span className='text-body-md'>Total</span>
                    <span className='text-price-display'>{formatearPrecio(totalBorrador)}</span>
                </div>
                <p className={`text-body-sm ${s.resumenEnvioNota}`}>
                    Una vez enviado no vas a poder editar ni cancelar estos platos desde esta
                    pantalla.
                </p>
            </ConfirmacionModal>
        </div>
    )
}
