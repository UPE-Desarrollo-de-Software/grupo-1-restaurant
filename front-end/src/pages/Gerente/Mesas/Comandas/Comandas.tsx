import { useEffect, useState } from 'react'
import { Alert, Button, Card, Spinner } from 'react-bootstrap'
import { useDatos } from '../../../../hooks/useDatos'
import type { CuentaMesa, Mesa, ParteCuenta, ResumenMesa } from '../../../../types/Mesa'
import { getCuentaMesa, getResumenMesa } from '../../../../api/mesas'
import s from '../Mesas.module.css'

type Vista = 'comanda' | 'cuenta'

const formatearPrecio = (precio: number): string =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(precio)

const formatearFecha = (fecha: string): string => {
    const momento = new Date(fecha.replace(' ', 'T'))
    if (Number.isNaN(momento.getTime())) return fecha
    return momento.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
}

const textoEstado = (estado: string): string => estado.replace(/_/g, ' ')

const chipEstadoClass = (estado: string): string => {
    if (estado === 'ocupada') return s.chipOcupada
    if (estado === 'reservada') return s.chipReservada
    return s.chipLibre
}

// Auxiliar de línea: promo y descuento solo si existen (patrón por
// componente, igual que formatearPrecio).
function AuxiliarLinea({ descuento, promocion }: { descuento: number; promocion: { nombre: string } | null }) {
    return (
        <span className={`text-body-sm ${s.lineaAux}`}>
            {promocion && <span className={s.promoTag}>{promocion.nombre}</span>}
            {descuento > 0 && (
                <span className={s.descuento}>− {formatearPrecio(descuento)}</span>
            )}
        </span>
    )
}

function BloqueParte({ parte, indice }: { parte: ParteCuenta; indice: number }) {
    return (
        <Card className={s.parteCard}>
            <div className={s.pedidoHeader}>
                <span className={`text-headline-sm ${s.pedidoTitulo}`}>Parte {indice + 1}</span>
                <span className={`text-label-sm ${s.badgeEstado}`}>Pedido #{parte.pedido_id}</span>
            </div>
            <ul className={s.lineas}>
                {parte.lineas.map(linea => (
                    <li key={linea.detalle_id} className={s.linea}>
                        <span className={`text-body-md ${s.lineaPlato}`}>
                            {linea.cantidad}× {linea.plato}
                        </span>
                        <AuxiliarLinea descuento={linea.descuento} promocion={linea.promocion} />
                        <span className={`text-body-md ${s.lineaMonto}`}>
                            {formatearPrecio(linea.subtotal)}
                        </span>
                    </li>
                ))}
            </ul>
            <div className={s.pedidoTotal}>
                <span className='text-label-md'>Subtotal de la parte</span>
                <span className='text-price-display'>{formatearPrecio(parte.subtotal)}</span>
            </div>
        </Card>
    )
}

export function ComandasPage() {
    const { items, loading, error } = useDatos('mesa')
    const [mesaSel, setMesaSel] = useState<Mesa | null>(null)
    const [vista, setVista] = useState<Vista>('comanda')
    const [comanda, setComanda] = useState<ResumenMesa | null>(null)
    const [cuenta, setCuenta] = useState<CuentaMesa | null>(null)
    const [cargandoDetalle, setCargandoDetalle] = useState(false)
    const [errorDetalle, setErrorDetalle] = useState<string | null>(null)

    const mesas = items as Mesa[]

    function seleccionarMesa(mesa: Mesa) {
        setMesaSel(mesa)
        setVista('comanda')
        setComanda(null)
        setCuenta(null)
        setErrorDetalle(null)
        setCargandoDetalle(true)
    }

    function volver() {
        setMesaSel(null)
        setComanda(null)
        setCuenta(null)
        setErrorDetalle(null)
    }

    function cambiarVista(nueva: Vista) {
        if (nueva === vista) return
        setVista(nueva)
        setComanda(null)
        setCuenta(null)
        setErrorDetalle(null)
        setCargandoDetalle(true)
    }

    useEffect(() => {
        if (!mesaSel) return
        const controller = new AbortController()
        const promesa = vista === 'comanda'
            ? getResumenMesa(mesaSel.id, controller.signal)
            : getCuentaMesa(mesaSel.id, controller.signal)

        promesa
            .then(data => {
                if (vista === 'comanda') setComanda(data as ResumenMesa)
                else setCuenta(data as CuentaMesa)
                setCargandoDetalle(false)
            })
            .catch(err => {
                if (controller.signal.aborted) return
                setErrorDetalle(
                    err instanceof Error ? err.message : 'Error desconocido al cargar el detalle'
                )
                setCargandoDetalle(false)
            })
        return () => controller.abort()
    }, [mesaSel, vista])

    if (!mesaSel) {
        return (
            <div className={`${s.page} ${s.hub}`}>
                <p className={`text-body-md ${s.vacio}`}>
                    Seleccioná una mesa para ver su comanda y su cuenta de la visita en curso.
                </p>

                {loading && (
                    <div className='d-flex justify-content-center py-4'>
                        <Spinner animation='border' />
                    </div>
                )}
                {error && <Alert variant='danger' className='text-body-md'>{error}</Alert>}
                {!loading && !error && mesas.length === 0 && (
                    <p className={`text-body-md text-center ${s.vacio}`}>No hay mesas cargadas todavía.</p>
                )}

                <div className={s.mesasGrid}>
                    {mesas.map(mesa => (
                        <button
                            key={mesa.id}
                            type='button'
                            className={`${s.chipMesa} ${chipEstadoClass(mesa.estado)}`}
                            onClick={() => seleccionarMesa(mesa)}
                        >
                            <span className={`text-label-sm ${s.chipId}`}>
                                #{String(mesa.id).padStart(2, '0')}
                            </span>
                            <span className={`text-headline-sm ${s.chipCapacidad}`}>
                                {mesa.capacidad} lugares
                            </span>
                            <span className='text-label-sm'>{textoEstado(mesa.estado)}</span>
                        </button>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className={`${s.page} ${s.hub}`}>
            <div className={s.detalleHeader}>
                <Button
                    variant='outline-secondary'
                    size='sm'
                    className='text-label-md'
                    type='button'
                    onClick={volver}
                >
                    <i className='bi bi-arrow-left me-1' aria-hidden='true' />
                    Mesas
                </Button>

                <div className={s.detalleTitulo}>
                    <h2 className='text-headline-sm'>
                        Mesa #{String(mesaSel.id).padStart(2, '0')}
                    </h2>
                    <p className={`text-body-sm ${s.detalleSub}`}>
                        {mesaSel.capacidad} lugares · {textoEstado(mesaSel.estado)}
                    </p>
                </div>

                <div className={s.vistaToggle}>
                    <Button
                        size='sm'
                        className='text-label-md'
                        variant={vista === 'comanda' ? 'primary' : 'outline-primary'}
                        type='button'
                        onClick={() => cambiarVista('comanda')}
                    >
                        Comanda
                    </Button>
                    <Button
                        size='sm'
                        className='text-label-md'
                        variant={vista === 'cuenta' ? 'primary' : 'outline-primary'}
                        type='button'
                        onClick={() => cambiarVista('cuenta')}
                    >
                        Cuenta
                    </Button>
                </div>
            </div>

            {errorDetalle && <Alert variant='danger' className='text-body-md'>{errorDetalle}</Alert>}

            {cargandoDetalle ? (
                <div className='d-flex justify-content-center py-4'>
                    <Spinner animation='border' />
                </div>
            ) : vista === 'comanda' && comanda ? (
                <div className='d-flex flex-column gap-3'>
                    {comanda.pedidos.length === 0 ? (
                        <p className={`text-body-md text-center ${s.vacio}`}>Sin pedidos en esta visita.</p>
                    ) : (
                        comanda.pedidos.map(pedido => (
                            <Card key={pedido.id} className={s.parteCard}>
                                <div className={s.pedidoHeader}>
                                    <span className={`text-headline-sm ${s.pedidoTitulo}`}>
                                        Pedido #{pedido.id}
                                    </span>
                                    <span className={`text-label-sm ${s.badgeEstado}`}>
                                        {textoEstado(pedido.estado)}
                                    </span>
                                    <span className={`text-label-sm ${pedido.todas_confirmadas ? s.badgeOk : s.badgePendiente}`}>
                                        {pedido.todas_confirmadas ? 'Todas confirmadas' : 'Faltan confirmar'}
                                    </span>
                                </div>
                                <ul className={s.lineas}>
                                    {pedido.lineas.map(linea => (
                                        <li key={linea.detalle_id} className={s.linea}>
                                            <span className={`text-body-md ${s.lineaPlato}`}>
                                                {linea.cantidad}× {linea.plato}
                                            </span>
                                            <AuxiliarLinea descuento={linea.descuento} promocion={linea.promocion} />
                                            <span className={`text-body-md ${s.lineaMonto}`}>
                                                {formatearPrecio(linea.subtotal)}
                                            </span>
                                            <span
                                                className={linea.confirmado ? s.confirmadoSi : s.confirmadoNo}
                                                title={linea.confirmado ? 'Línea confirmada' : 'Línea sin confirmar'}
                                            >
                                                <i
                                                    className={`bi ${linea.confirmado ? 'bi-check2-circle' : 'bi-dash-circle'}`}
                                                    aria-hidden='true'
                                                />
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                                <div className={s.pedidoTotal}>
                                    <span className='text-label-md'>Total del pedido</span>
                                    <span className='text-price-display'>{formatearPrecio(pedido.total)}</span>
                                </div>
                            </Card>
                        ))
                    )}

                    {comanda.grupo && comanda.grupo.length > 0 && (
                        <div className={s.grupoSeccion}>
                            <h3 className={`text-headline-sm ${s.grupoTitulo}`}>
                                Mesas del grupo {mesaSel.grupo_codigo ? `#${mesaSel.grupo_codigo}` : ''}
                            </h3>
                            <ul className={s.grupoLista}>
                                {comanda.grupo.map(hermana => (
                                    <li key={hermana.mesa_id} className={`text-body-md ${s.grupoItem}`}>
                                        Mesa #{String(hermana.mesa_id).padStart(2, '0')}
                                        <span className={s.badgeEstado}>
                                            {hermana.pedido_estado
                                                ? textoEstado(hermana.pedido_estado)
                                                : 'sin pedido activo'}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            ) : vista === 'cuenta' && cuenta ? (
                <div className='d-flex flex-column gap-3'>
                    <div className={s.totalBox}>
                        <p className={`text-label-md ${s.totalEtiqueta}`}>
                            Total de la visita
                            {cuenta.ocupada_desde && ` · desde ${formatearFecha(cuenta.ocupada_desde)}`}
                        </p>
                        <p className='text-price-display'>{formatearPrecio(cuenta.total)}</p>
                    </div>

                    {cuenta.partes.length === 0 ? (
                        <p className={`text-body-md text-center ${s.vacio}`}>Sin pedidos en esta visita.</p>
                    ) : (
                        cuenta.partes.map((parte, indice) => (
                            <BloqueParte key={parte.pedido_id} parte={parte} indice={indice} />
                        ))
                    )}

                    {cuenta.grupo && cuenta.grupo.length > 0 && (
                        <div className={s.grupoSeccion}>
                            <h3 className={`text-headline-sm ${s.grupoTitulo}`}>
                                Cuentas del grupo {mesaSel.grupo_codigo ? `#${mesaSel.grupo_codigo}` : ''}
                            </h3>
                            {cuenta.grupo.map(hermana => (
                                <div key={hermana.mesa_id} className='d-flex flex-column gap-3'>
                                    <div className={s.grupoHeader}>
                                        <span className='text-headline-sm'>
                                            Mesa #{String(hermana.mesa_id).padStart(2, '0')}
                                        </span>
                                        <span className='text-price-display'>
                                            {formatearPrecio(hermana.total)}
                                        </span>
                                    </div>
                                    {hermana.partes.map((parte, indice) => (
                                        <BloqueParte key={parte.pedido_id} parte={parte} indice={indice} />
                                    ))}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : null}

            <p className={`text-body-sm ${s.nota}`}>
                Se muestra la visita actual de la mesa. El histórico global de comandas
                está pendiente de un endpoint de comandas del equipo de back.
            </p>
        </div>
    )
}
