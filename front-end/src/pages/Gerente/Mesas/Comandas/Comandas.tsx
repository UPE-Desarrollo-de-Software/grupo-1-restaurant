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

// Listado de comandas: una fila por mesa; al expandir una fila se carga
// su comanda/cuenta ahí mismo (1 request por expansión, sin N+1). La fila
// abierta se identifica por `expandida` (id de mesa) y `cargadoDe` deriva
// el estado de carga (regla react-hooks/set-state-in-effect).
export function ComandasPage() {
    const { items, loading, error } = useDatos('mesa')
    const [expandida, setExpandida] = useState<number | null>(null)
    const [vista, setVista] = useState<Vista>('comanda')
    const [comanda, setComanda] = useState<ResumenMesa | null>(null)
    const [cuenta, setCuenta] = useState<CuentaMesa | null>(null)
    const [errorDetalle, setErrorDetalle] = useState<string | null>(null)
    const [cargadoDe, setCargadoDe] = useState<string | null>(null)

    const mesas = items as Mesa[]
    const clave = expandida !== null ? `${expandida}-${vista}` : null
    const cargandoDetalle = clave !== null && cargadoDe !== clave

    function alternar(mesa: Mesa) {
        if (expandida === mesa.id) {
            setExpandida(null)
            return
        }
        setExpandida(mesa.id)
        setVista('comanda')
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
    }

    useEffect(() => {
        if (expandida === null) return
        const controller = new AbortController()
        const promesa = vista === 'comanda'
            ? getResumenMesa(expandida, controller.signal)
            : getCuentaMesa(expandida, controller.signal)

        promesa
            .then(data => {
                if (controller.signal.aborted) return
                if (vista === 'comanda') setComanda(data as ResumenMesa)
                else setCuenta(data as CuentaMesa)
                setCargadoDe(`${expandida}-${vista}`)
            })
            .catch(err => {
                if (controller.signal.aborted) return
                setErrorDetalle(
                    err instanceof Error ? err.message : 'Error desconocido al cargar el detalle'
                )
                setCargadoDe(`${expandida}-${vista}`)
            })
        return () => controller.abort()
    }, [expandida, vista])

    return (
        <div className={`${s.page} ${s.hub}`}>
            <h2 className={`text-headline-lg ${s.tituloListado}`}>Mesas</h2>
            <p className={`text-body-md ${s.vacio}`}>
                Tocá una mesa para ver su comanda y su cuenta de la visita en curso.
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

            <ul className={s.listaMesas}>
                {mesas.map(mesa => {
                    const abierta = expandida === mesa.id
                    return (
                        <li key={mesa.id} className={s.itemMesa}>
                            <button
                                type='button'
                                className={s.filaMesa}
                                aria-expanded={abierta}
                                aria-controls={`comanda-mesa-${mesa.id}`}
                                onClick={() => alternar(mesa)}
                            >
                                <span className={`text-label-sm ${s.chipId}`}>
                                    #{String(mesa.id).padStart(2, '0')}
                                </span>
                                <span className={`text-headline-sm ${s.filaCapacidad}`}>
                                    {mesa.capacidad} lugares
                                </span>
                                <i
                                    className={`bi ${abierta ? 'bi-chevron-up' : 'bi-chevron-down'} ${s.filaChevron}`}
                                    aria-hidden='true'
                                />
                            </button>

                            {abierta && (
                                <div id={`comanda-mesa-${mesa.id}`} className={s.panelMesa}>
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

                                    {errorDetalle && (
                                        <Alert variant='danger' className='text-body-md'>{errorDetalle}</Alert>
                                    )}

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
                                                        Mesas del grupo {mesa.grupo_codigo ? `#${mesa.grupo_codigo}` : ''}
                                                    </h3>
                                                    <ul className={s.grupoLista}>
                                                        {comanda.grupo.map(hermana => (
                                                            <li key={hermana.mesa_id} className={`text-body-md ${s.grupoItem}`}>
                                                                Mesa #{hermana.mesa_id}
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
                                                        Cuentas del grupo {mesa.grupo_codigo ? `#${mesa.grupo_codigo}` : ''}
                                                    </h3>
                                                    {cuenta.grupo.map(hermana => (
                                                        <div key={hermana.mesa_id} className='d-flex flex-column gap-3'>
                                                            <div className={s.grupoHeader}>
                                                                <span className='text-headline-sm'>
                                                                    Mesa #{hermana.mesa_id}
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
                                </div>
                            )}
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}
