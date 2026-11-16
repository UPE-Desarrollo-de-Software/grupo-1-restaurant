import { useEffect, useState } from 'react'
import { Alert, Badge, Button, Spinner } from 'react-bootstrap'
import { Link, useSearchParams } from 'react-router-dom'
import { ErrorCliente, crearPagoCliente, getCuentaCliente, getPagosCliente, llamarMozo, verificarPagoCliente } from '../../api/cliente'
import { useCliente } from '../../context/ClienteContext/useCliente'
import { useMesaRealtime } from '../../realtime/useRealtimeMesa'
import type { LineaBorrador } from '../../types/Cliente'
import type { EstadoPedido, ParteCuenta, PedidoResumen } from '../../types/Mesa'
import type { PagosCliente, TipoPago } from '../../types/Pago'
import { importeLinea, unitarioLinea } from '../../utils/borrador'
import { ConfirmacionModal } from '../../components/Cliente/ConfirmacionModal'
import { PersonalizarPlatoModal } from '../../components/Cliente/PersonalizarPlatoModal'
import s from './PedidoPage.module.css'

type Vista = 'pedido' | 'cuenta'

// Retorno de Checkout Pro: Mercado Pago agrega sus parámetros
// (?payment_id=&status=&preference_id=…) al back_url /pedido. Esos
// ids son los que se le mandan al back para verificar contra la API
// de MP (la URL nunca es fuente de verdad).
type EstadoVerificacion = 'verificando' | 'acreditado' | 'rechazado' | 'sin_acreditar' | 'en_proceso'

interface RetornoPago {
    estado: string | null
    paymentId: string | null
    preferenceId: string | null
}

// Lo que había que acreditar al salir hacia Mercado Pago: el saldo
// sólo se considera acreditado cuando el BACK lo refleja (el webhook
// es la fuente de verdad, nunca el parámetro de la URL).
interface RetornoPagoGuardado {
    monto: number
    pagadoPrevio: number
    ts: number
}

const CLAVE_RETORNO_PAGO = 'gastro_pago_retorno'

function leerRetornoPago(): RetornoPagoGuardado | null {
    try {
        const crudo = sessionStorage.getItem(CLAVE_RETORNO_PAGO)
        if (!crudo) return null
        const datos = JSON.parse(crudo) as Partial<RetornoPagoGuardado>
        if (typeof datos.monto !== 'number' || typeof datos.pagadoPrevio !== 'number') return null
        return { monto: datos.monto, pagadoPrevio: datos.pagadoPrevio, ts: datos.ts ?? 0 }
    } catch {
        return null
    }
}

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
function BloqueParte({
    parte,
    indice,
    esMia,
    saldo,
    pagando,
    onPagar,
}: {
    parte: ParteCuenta
    indice: number
    esMia: boolean
    // Lo que esta parte ya abonó / le falta según los pagos
    // aprobados (GET /cliente/pagos); undefined = sin datos de pago.
    saldo?: { pagado: number; pendiente: number }
    pagando?: boolean
    onPagar?: () => void
}) {
    return (
        <article className={esMia ? `${s.parte} ${s.parteMia}` : s.parte}>
            <header className={s.parteHeader}>
                <span className='text-body-md'>Parte {indice + 1}</span>
                <span>
                    {esMia && <Badge bg='primary' className='text-label-sm'>Tu parte</Badge>}
                    {(saldo?.pagado ?? 0) > 0 && (
                        <Badge bg='success' className='text-label-sm ms-1'>Pagado</Badge>
                    )}
                </span>
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
            {saldo && saldo.pagado > 0 && (
                <div className={s.saldoFila}>
                    <span className='text-body-sm'>Saldo pendiente</span>
                    <span className='text-body-md'>
                        {saldo.pendiente > 0 ? formatearPrecio(saldo.pendiente) : 'Saldada'}
                    </span>
                </div>
            )}
            {onPagar && (
                <div className={s.partePagar}>
                    <Button
                        type='button'
                        size='sm'
                        variant='primary'
                        className='text-label-md'
                        disabled={pagando}
                        onClick={onPagar}
                    >
                        {pagando
                            ? <><Spinner size='sm' animation='border' className='me-1' />Iniciando…</>
                            : <><i className='bi bi-credit-card me-1' aria-hidden='true' />Pagar mi parte</>}
                    </Button>
                </div>
            )}
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

    // Retorno de Checkout Pro: Mercado Pago agrega sus parámetros al
    // back_url /pedido. Se procesa una sola vez (estado inicial) y la
    // URL se limpia dentro de la verificación (un refresh no
    // reintenta). Al volver, la vista arranca en "Cuenta".
    const [parametros, setParametros] = useSearchParams()
    const [retornoPago] = useState<RetornoPago | null>(() => {
        const estado = parametros.get('status') ?? parametros.get('collection_status')
        const paymentId = parametros.get('payment_id') ?? parametros.get('collection_id')
        const preferenceId = parametros.get('preference_id')
        return estado === null && paymentId === null && preferenceId === null
            ? null
            : { estado, paymentId, preferenceId }
    })

    const [vista, setVista] = useState<Vista>(retornoPago ? 'cuenta' : 'pedido')
    const [cuenta, setCuenta] = useState<Awaited<ReturnType<typeof getCuentaCliente>> | null>(null)
    const [errorCuenta, setErrorCuenta] = useState<string | null>(null)
    const [nonceCuenta, setNonceCuenta] = useState(0)

    // Pagos (Mercado Pago): saldo + historial + feature flag
    // `habilitado` (sin credenciales el back lo manda en false y los
    // botones de pago quedan ocultos).
    const [pagos, setPagos] = useState<PagosCliente | null>(null)
    const [errorPagos, setErrorPagos] = useState<string | null>(null)
    const [pagoEnCurso, setPagoEnCurso] = useState<TipoPago | null>(null)
    const [errorPago, setErrorPago] = useState<string | null>(null)

    // Verificación del retorno: sólo se observa el saldo del back
    // hasta que el webhook acredite el pago (la URL no es fuente de
    // verdad). 'sin_acreditar' ofrece reintentar sin recargar.
    const [estadoVerificacion, setEstadoVerificacion] = useState<EstadoVerificacion | null>(
        retornoPago ? 'verificando' : null,
    )
    const [nonceVerificacion, setNonceVerificacion] = useState(0)
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

    // Refresco disparado por el canal de la mesa (.pedido.creado /
    // .pedido.estado): el payload sólo trae ids y estados, así que se
    // vuelve a pedir el resumen. Si el código murió (401/403) el provider
    // ya limpia la sesión; un fallo de red se muestra en "Pedidos
    // enviados" sin romper el tiempo real.
    function refrescarPedidos() {
        recargarResumen()
            .then(() => setErrorResumen(null))
            .catch((err: unknown) => {
                if (err instanceof ErrorCliente && (err.status === 401 || err.status === 403)) return
                setErrorResumen(err instanceof Error ? err.message : 'No se pudieron actualizar tus pedidos')
            })
    }

    // Tiempo real del comensal: el canal privado de su mesa avisa que el
    // mozo fue notificado (el POST /cliente/llamar dispara .mesa.atencion),
    // así el botón queda bloqueado aunque el aviso haya salido de otro
    // dispositivo de la misma mesa. También avisa cada alta y cada cambio
    // de estado de pedido (la cocina y el mozo los disparan desde el
    // back), y en esos casos se refresca el resumen para repintar el
    // badge de estado. Al reconectar se refresca todo.
    useMesaRealtime(mesa?.id ?? null, mesa?.codigo_acceso ?? null, {
        alLlamarMozo: () => setAvisoEnviado(true),
        alCrearPedido: refrescarPedidos,
        alCambiarEstadoPedido: refrescarPedidos,
        alConectar: refrescarPedidos,
    })

    // Pedidos de ESTE comensal: los que creó desde esta pantalla
    // (pedidoIds) y los nacidos de la pre-orden de la reserva, que el
    // back marca con `es_preorden` y este dispositivo adopta aunque no
    // los haya enviado desde acá. El resumen trae todos los de la mesa,
    // incluidos los de otros comensales en sesiones de grupo.
    useEffect(() => {
        if (!mesaIdentificada) return
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

    // Cuenta de la visita y pagos: sólo se piden al abrir la pestaña
    // (y al reintentar vía nonceCuenta). El estado de carga se deriva.
    useEffect(() => {
        if (vista !== 'cuenta' || !mesa) return
        const controller = new AbortController()
        let cancelado = false
        const codigo = mesa.codigo_acceso
        const esAborto = (err: unknown) => err instanceof DOMException && err.name === 'AbortError'

        getCuentaCliente(codigo, controller.signal)
            .then(data => {
                if (!cancelado) {
                    setCuenta(data)
                    setErrorCuenta(null)
                }
            })
            .catch(err => {
                if (cancelado || esAborto(err)) return
                setCuenta(null)
                setErrorCuenta(err instanceof Error ? err.message : 'No se pudo cargar la cuenta de la mesa')
            })

        getPagosCliente(codigo, controller.signal)
            .then(data => {
                if (!cancelado) {
                    setPagos(data)
                    setErrorPagos(null)
                }
            })
            .catch(err => {
                if (cancelado || esAborto(err)) return
                setPagos(null)
                setErrorPagos(err instanceof Error ? err.message : 'No se pudo consultar el estado de los pagos')
            })

        return () => {
            cancelado = true
            controller.abort()
        }
    }, [vista, mesa, nonceCuenta])

    // Retorno de Mercado Pago: se pregunta al BACK por el pago real
    // (POST /cliente/pagos/verificar, que consulta la API de MP) cada
    // 10 s, máx. 6 intentos. La URL sólo identifica la vuelta: el
    // estado sale de MP, nunca del parámetro. La URL se limpia en el
    // primer intento (un refresh no reintenta contra el throttle).
    useEffect(() => {
        if (!retornoPago || !mesa || estadoVerificacion !== 'verificando') return
        const controller = new AbortController()
        let cancelado = false
        let intentos = 0
        let temporizador: ReturnType<typeof setTimeout> | undefined
        const codigo = mesa.codigo_acceso
        const esperado = leerRetornoPago()
        const rechazado = ['rejected', 'cancelled', 'refunded', 'charged_back'].includes(retornoPago.estado ?? '')
        const referencia = {
            ...(retornoPago.paymentId !== null ? { payment_id: retornoPago.paymentId } : {}),
            ...(retornoPago.preferenceId !== null ? { preference_id: retornoPago.preferenceId } : {}),
        }
        const REFERENCIA_VACIA = Object.keys(referencia).length === 0

        const resolver = (estado: EstadoVerificacion) => {
            sessionStorage.removeItem(CLAVE_RETORNO_PAGO)
            setEstadoVerificacion(estado)
        }

        const verificar = () => {
            intentos += 1

            const consulta = REFERENCIA_VACIA
                // Sin ids en la URL sólo queda observar el saldo.
                ? getPagosCliente(codigo, controller.signal).then(datos => ({ datos, verificacion: null }))
                : verificarPagoCliente(codigo, referencia, controller.signal)
                    .then(datos => ({ datos, verificacion: datos.verificacion }))

            consulta
                .then(({ datos, verificacion }) => {
                    if (cancelado) return
                    setPagos(datos)
                    setErrorPagos(null)
                    setParametros({}, { replace: true })

                    const estadoMp = verificacion?.estado ?? null

                    if (rechazado || estadoMp === 'rechazado' || estadoMp === 'cancelado') {
                        resolver('rechazado')
                        return
                    }
                    if (estadoMp === 'aprobado'
                        || (esperado !== null && datos.saldo.pagado >= esperado.pagadoPrevio + esperado.monto - 0.01)) {
                        resolver('acreditado')
                        return
                    }
                    if (intentos >= 6) {
                        // MP aún no resolvió: el pago queda "en
                        // proceso" (fondos retenidos, se acredita solo).
                        resolver(estadoMp === 'en_proceso' ? 'en_proceso' : 'sin_acreditar')
                        return
                    }
                    temporizador = setTimeout(verificar, 10000)
                })
                .catch(err => {
                    if (cancelado || (err instanceof DOMException && err.name === 'AbortError')) return
                    // 502 (MP sin responder) merece otro intento.
                    if (err instanceof ErrorCliente && err.status === 502 && intentos < 6) {
                        temporizador = setTimeout(verificar, 10000)
                        return
                    }
                    resolver('sin_acreditar')
                    setErrorPago(err instanceof Error ? err.message : 'No se pudo verificar el pago')
                })
        }

        verificar()

        return () => {
            cancelado = true
            controller.abort()
            if (temporizador !== undefined) clearTimeout(temporizador)
        }
    }, [retornoPago, mesa, estadoVerificacion, nonceVerificacion, setParametros])

    // Hay sección "Pedidos enviados" si este comensal creó pedidos, si
    // el resumen trae uno nacido de la pre-orden (adoptado como suyo) o
    // si todavía se está cargando (para poder mostrar el spinner).
    const hayPedidosEnviados = pedidoIds.length > 0
        || (mesaIdentificada && (resumen === null
            || resumen.pedidos.some(pedido => pedido.es_preorden)))
    const cargandoResumen = hayPedidosEnviados && resumen === null && errorResumen === null
    // El back ordena por id ascendente; acá el último pedido enviado queda arriba.
    const misPedidos = resumen
        ? resumen.pedidos
            .filter((pedido: PedidoResumen) => pedidoIds.includes(pedido.id) || pedido.es_preorden)
            .slice()
            .sort((a, b) => b.id - a.id)
        : []
    const cargandoCuenta = vista === 'cuenta' && cuenta === null && errorCuenta === null
    // Un pago "en proceso" en MP (fondos retenidos) bloquea cualquier
    // nuevo intento de cobro: el que está se acredita solo.
    const hayPagoEnProceso = pagos?.pagos.some(pago => pago.estado === 'en_proceso') ?? false

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

    // Inicia un pago Checkout Pro: el back calcula el monto y devuelve
    // `init_point` (URL de Mercado Pago). Se guarda lo esperado para
    // poder detectar la acreditación al volver; la confirmación la da
    // el webhook del back, nunca el parámetro de la URL.
    async function iniciarPago(tipo: TipoPago, pedidoRaizId?: number) {
        if (!mesa || pagoEnCurso !== null) return
        setPagoEnCurso(tipo)
        setErrorPago(null)
        try {
            const preferencia = await crearPagoCliente(mesa.codigo_acceso, {
                tipo,
                ...(pedidoRaizId !== undefined ? { pedido_id: pedidoRaizId } : {}),
            })
            sessionStorage.setItem(CLAVE_RETORNO_PAGO, JSON.stringify({
                monto: preferencia.monto,
                pagadoPrevio: pagos?.saldo.pagado ?? 0,
                ts: Date.now(),
            } satisfies RetornoPagoGuardado))
            window.location.assign(preferencia.init_point)
        } catch (err) {
            // 503 (módulo apagado) y 422 (cuenta saldada) llegan como
            // mensajes en español; el botón queda libre para reintentar.
            setErrorPago(err instanceof Error ? err.message : 'No se pudo iniciar el pago. Probá de nuevo.')
            setPagoEnCurso(null)
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

                    {/* Pagos: verificación del retorno de MP y avisos */}
                    {errorPagos && (
                        <Alert variant='warning' className='text-body-md'>
                            {errorPagos}{' '}
                            <button
                                type='button'
                                className={`btn btn-link btn-sm p-0 align-baseline ${s.reintentar}`}
                                onClick={reintentarCuenta}
                            >
                                Reintentar
                            </button>
                        </Alert>
                    )}

                    {estadoVerificacion === 'verificando' && (
                        <div className={s.cargandoGlobal}>
                            <Spinner animation='border' size='sm' />
                            <span className='text-body-md'>Verificando tu pago con Mercado Pago…</span>
                        </div>
                    )}

                    {estadoVerificacion === 'acreditado' && (
                        <Alert variant='success' className='text-body-md' dismissible onClose={() => setEstadoVerificacion(null)}>
                            ¡Pago acreditado! Tu saldo ya lo refleja.
                        </Alert>
                    )}

                    {estadoVerificacion === 'rechazado' && (
                        <Alert variant='danger' className='text-body-md' dismissible onClose={() => setEstadoVerificacion(null)}>
                            El pago fue rechazado por Mercado Pago y no se realizó ningún cargo. Podés
                            intentarlo de nuevo o consultarlo con tu mozo.
                        </Alert>
                    )}

                    {estadoVerificacion === 'en_proceso' && (
                        <Alert variant='warning' className='text-body-md' dismissible onClose={() => setEstadoVerificacion(null)}>
                            Mercado Pago tiene tu pago en proceso: se acredita solo en unos minutos y el
                            saldo lo va a reflejar. No hagas otro pago mientras tanto.
                        </Alert>
                    )}

                    {estadoVerificacion === 'sin_acreditar' && (
                        <Alert variant='warning' className='text-body-md' dismissible onClose={() => setEstadoVerificacion(null)}>
                            {errorPago ?? 'Todavía no vimos el pago acreditado. Si pagaste, puede tardar unos segundos: mirá el saldo abajo o consultá con tu mozo.'}{' '}
                            <button
                                type='button'
                                className={`btn btn-link btn-sm p-0 align-baseline ${s.reintentar}`}
                                onClick={() => {
                                    setErrorPago(null)
                                    setEstadoVerificacion('verificando')
                                    setNonceVerificacion(n => n + 1)
                                }}
                            >
                                Reintentar
                            </button>
                        </Alert>
                    )}

                    {errorPago && estadoVerificacion !== 'sin_acreditar' && (
                        <Alert variant='danger' className='text-body-md' dismissible onClose={() => setErrorPago(null)}>
                            {errorPago}
                        </Alert>
                    )}

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

                            {/* Saldo según los pagos aprobados del back:
                                pendiente = total − Σ aprobados. El
                                botón se oculta con el módulo apagado
                                (habilitado: false) o si ya no queda nada
                                por cobrar. */}
                            {pagos && (
                                <>
                                    <div className={s.totalBox}>
                                        <p className={`text-label-md ${s.totalEtiqueta}`}>
                                            {pagos.saldo.pendiente > 0 ? 'Saldo pendiente' : 'Cuenta saldada'}
                                            {hayPagoEnProceso && (
                                                <Badge bg='warning' text='dark' className='text-label-sm ms-2'>
                                                    Pago en proceso
                                                </Badge>
                                            )}
                                        </p>
                                        <p className='text-price-display'>{formatearPrecio(pagos.saldo.pendiente)}</p>
                                        <p className={`text-body-sm ${s.totalEtiqueta}`}>
                                            Pagado {formatearPrecio(pagos.saldo.pagado)} de {formatearPrecio(pagos.saldo.total)}
                                        </p>
                                        {pagos.saldo.pagado > pagos.saldo.total + 0.01 && (
                                            <p className={`text-body-sm ${s.totalEtiqueta}`}>
                                                A favor {formatearPrecio(pagos.saldo.pagado - pagos.saldo.total)}
                                            </p>
                                        )}
                                    </div>

                                    {/* Con un pago en proceso (MP reteniendo
                                        fondos) no se ofrece otro checkout:
                                        el cobro se acredita solo. */}
                                    {pagos.habilitado && pagos.saldo.pendiente > 0 && !hayPagoEnProceso && (
                                        <div className={s.enviarFila}>
                                            <Button
                                                type='button'
                                                variant='primary'
                                                className='text-label-md'
                                                disabled={pagoEnCurso !== null}
                                                onClick={() => iniciarPago('total')}
                                            >
                                                {pagoEnCurso === 'total'
                                                    ? <><Spinner size='sm' animation='border' className='me-1' />Iniciando…</>
                                                    : <><i className='bi bi-credit-card me-1' aria-hidden='true' />Pagar total {formatearPrecio(pagos.saldo.pendiente)}</>}
                                            </Button>
                                        </div>
                                    )}
                                </>
                            )}

                            {cuenta.partes.length === 0 ? (
                                <p className={`text-body-md text-center ${s.vacioTexto}`}>
                                    Sin pedidos en esta visita todavía.
                                </p>
                            ) : (
                                cuenta.partes.map((parte, indice) => {
                                    const esMia = parte.es_preorden || parte.pedido_ids.some(id => pedidoIds.includes(id))
                                    const saldoParte = pagos?.saldo.partes.find(p => p.pedido_id === parte.pedido_id)
                                    return (
                                        <BloqueParte
                                            key={parte.pedido_id}
                                            parte={parte}
                                            indice={indice}
                                            esMia={esMia}
                                            saldo={saldoParte}
                                            pagando={pagoEnCurso === 'mi_parte'}
                                            onPagar={pagos?.habilitado && !hayPagoEnProceso && esMia && (saldoParte?.pendiente ?? 0) > 0
                                                ? () => iniciarPago('mi_parte', parte.pedido_id)
                                                : undefined}
                                        />
                                    )
                                })
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
