import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Alert, Button, Card, Spinner } from 'react-bootstrap'
import { getCuentaMesa, getMesa, getResumenMesa } from '../../api/mesas'
import { PedidoCard } from '../../components/Pedidos/PedidoCard'
import { TomarPedido } from '../../components/Pedidos/TomarPedido'
import type { CuentaMesa, MesaConCodigo, ParteCuenta, ResumenMesa } from '../../types/Mesa'
import s from './MozoMesa.module.css'

// Atención de una mesa desde el rol Mozo: comanda con acciones de estado
// (espejo de Comandas del gerente, pero operativa) + alta de líneas
// (TomarPedido) + cuenta de la visita. Si la mesa quedó borrada (al
// cerrar el último pedido final el backend la destruye), getMesa falla
// pero la comanda/cuenta siguen disponibles (MesaService::cuenta usa
// conTrashed): se avisa y se sigue mostrando todo.

type Vista = 'comanda' | 'cuenta'

const formatearPrecio = (precio: number): string =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(precio)

const formatearFecha = (fecha: string): string => {
    const momento = new Date(fecha.replace(' ', 'T'))
    if (Number.isNaN(momento.getTime())) return fecha
    return momento.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
}

// No se exporta: react-refresh/only-export-components.
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
                        <span className={`text-body-sm ${s.lineaAux}`}>
                            {linea.promocion && <span className={s.promoTag}>{linea.promocion.nombre}</span>}
                            {linea.descuento > 0 && <span className={s.descuento}>− {formatearPrecio(linea.descuento)}</span>}
                        </span>
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

export function MozoMesaPage() {
    const { id } = useParams()
    const mesaId = Number(id)

    const [mesa, setMesa] = useState<MesaConCodigo | null>(null)
    const [mesaError, setMesaError] = useState<string | null>(null)
    const [vista, setVista] = useState<Vista>('comanda')
    const [comanda, setComanda] = useState<ResumenMesa | null>(null)
    const [cuenta, setCuenta] = useState<CuentaMesa | null>(null)
    const [errorDetalle, setErrorDetalle] = useState<string | null>(null)
    const [mostrarTomar, setMostrarTomar] = useState(false)
    const [copiado, setCopiado] = useState(false)
    // Cada alta/acción exitosa incrementa el nonce y refetchea todo.
    const [nonce, setNonce] = useState(0)
    // La página está cargando mientras la combinación (mesa, vista, nonce)
    // actual no se haya resuelto: deriva del estado en vez de hacer
    // setState síncrono dentro del effect (regla react-hooks/set-state-in-effect).
    const [cargadoDe, setCargadoDe] = useState<string | null>(null)

    const clave = `${mesaId}-${vista}-${nonce}`
    const cargando = Number.isFinite(mesaId) && cargadoDe !== clave

    useEffect(() => {
        if (!Number.isFinite(mesaId)) return
        const controller = new AbortController()

        const pedirMesa = getMesa(mesaId, controller.signal)
            .then(data => {
                if (!controller.signal.aborted) {
                    setMesa(data)
                    setMesaError(null)
                }
            })
            .catch(err => {
                if (!controller.signal.aborted) {
                    setMesa(null)
                    setMesaError(err instanceof Error ? err.message : 'No se pudo cargar la mesa')
                }
            })

        const pedirDatos = vista === 'comanda'
            ? getResumenMesa(mesaId, controller.signal)
                .then(data => {
                    if (!controller.signal.aborted) {
                        setComanda(data)
                        setErrorDetalle(null)
                    }
                })
            : getCuentaMesa(mesaId, controller.signal)
                .then(data => {
                    if (!controller.signal.aborted) {
                        setCuenta(data)
                        setErrorDetalle(null)
                    }
                })

        const manejarError = (err: unknown) => {
            if (controller.signal.aborted) return
            setErrorDetalle(err instanceof Error ? err.message : 'Error desconocido al cargar el detalle')
        }

        Promise.all([pedirMesa, pedirDatos.catch(manejarError)])
            .then(() => {
                if (!controller.signal.aborted) setCargadoDe(clave)
            })

        return () => controller.abort()
    }, [mesaId, vista, nonce, clave])

    const recargar = () => setNonce(n => n + 1)

    async function copiarPin() {
        const pin = mesa?.codigo_acceso ?? comanda?.codigo_acceso ?? cuenta?.codigo_acceso
        if (!pin) return
        try {
            await navigator.clipboard.writeText(pin)
            setCopiado(true)
            setTimeout(() => setCopiado(false), 2000)
        } catch {
            // Sin soporte de clipboard: el PIN queda visible en pantalla.
        }
    }

    if (!Number.isFinite(mesaId)) {
        return (
            <div className={`${s.page} ${s.hub}`}>
                <Alert variant='danger' className='text-body-md'>Mesa inválida.</Alert>
                <Link to='/mozo/mesas' className='text-label-md'>Volver a mesas</Link>
            </div>
        )
    }

    const codigo = cargando
        ? null
        : (mesa?.codigo_acceso ?? comanda?.codigo_acceso ?? cuenta?.codigo_acceso ?? null)
    // El pedido en curso de ESTA mesa es el destino de TomarPedido; si no
    // hay, se crea una raíz nueva.
    const pedidoEnCurso = comanda?.pedidos.find(p => p.estado === 'en_curso') ?? null

    return (
        <div className={`${s.page} ${s.hub}`}>
            <div className={s.detalleHeader}>
                <Link to='/mozo' className='btn btn-outline-secondary btn-sm text-label-md'>
                    <i className='bi bi-arrow-left me-1' aria-hidden='true' />
                    Mesas
                </Link>

                <div className={s.detalleTitulo}>
                    <h2 className='text-headline-sm'>
                        Mesa #{String(mesaId).padStart(2, '0')}
                    </h2>
                    <p className={`text-body-sm ${s.detalleSub}`}>
                        {mesa
                            ? `${mesa.capacidad} lugares · ${mesa.estado.replace(/_/g, ' ')}`
                            : cargando ? 'Cargando datos de la mesa…' : 'Mesa no disponible'}
                    </p>
                </div>

                <div className={s.vistaToggle}>
                    <Button
                        size='sm'
                        className='text-label-md'
                        variant={vista === 'comanda' ? 'primary' : 'outline-primary'}
                        type='button'
                        onClick={() => setVista('comanda')}
                    >
                        Comanda
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
            </div>

            {codigo && (
                <div className={s.pinBox}>
                    <div>
                        <p className={`text-label-sm ${s.pinEtiqueta}`}>PIN de la mesa (código de acceso)</p>
                        <p className={`text-headline-sm ${s.pinValor}`}>{codigo}</p>
                    </div>
                    <Button
                        size='sm'
                        variant={copiado ? 'success' : 'outline-primary'}
                        className='text-label-md'
                        type='button'
                        onClick={copiarPin}
                    >
                        <i className={`bi ${copiado ? 'bi-check2' : 'bi-clipboard'} me-1`} aria-hidden='true' />
                        {copiado ? 'Copiado' : 'Copiar PIN'}
                    </Button>
                </div>
            )}

            {mesaError && !cargando && (
                <Alert variant='warning' className='text-body-md'>
                    <i className='bi bi-exclamation-triangle me-1' aria-hidden='true' />
                    {mesaError} — La mesa ya no está activa; se muestran la comanda y la cuenta de su última visita.
                </Alert>
            )}

            {errorDetalle && !cargando && <Alert variant='danger' className='text-body-md'>{errorDetalle}</Alert>}

            {cargando ? (
                <div className='d-flex justify-content-center py-4'>
                    <Spinner animation='border' />
                </div>
            ) : vista === 'comanda' && comanda ? (
                <div className='d-flex flex-column gap-3'>
                    {comanda.pedidos.length === 0 ? (
                        <p className={`text-body-md text-center ${s.vacio}`}>
                            Sin pedidos en esta visita. Usá "Tomar pedido" para agregar el primero.
                        </p>
                    ) : (
                        comanda.pedidos.map(pedido => (
                            <PedidoCard
                                key={pedido.id}
                                pedido={pedido}
                                onCambio={recargar}
                                onAgregar={
                                    pedido.estado === 'en_curso'
                                        ? () => {
                                            setMostrarTomar(true)
                                        }
                                        : undefined
                                }
                            />
                        ))
                    )}

                    <div>
                        <Button
                            size='sm'
                            variant={mostrarTomar ? 'outline-secondary' : 'primary'}
                            className='text-label-md'
                            type='button'
                            onClick={() => setMostrarTomar(abierto => !abierto)}
                        >
                            <i className={`bi ${mostrarTomar ? 'bi-x-lg' : 'bi-cart-plus'} me-1`} aria-hidden='true' />
                            {mostrarTomar ? 'Ocultar toma de pedido' : 'Tomar pedido'}
                        </Button>
                    </div>

                    {mostrarTomar && (
                        <TomarPedido
                            mesaId={mesaId}
                            pedidoId={pedidoEnCurso?.id ?? null}
                            onAlta={recargar}
                        />
                    )}

                    {comanda.grupo && comanda.grupo.length > 0 && (
                        <div className={s.grupoSeccion}>
                            <h3 className={`text-headline-sm ${s.grupoTitulo}`}>
                                Mesas del grupo {mesa?.grupo_codigo ? `#${mesa.grupo_codigo}` : ''}
                            </h3>
                            <ul className={s.grupoLista}>
                                {comanda.grupo.map(hermana => (
                                    <li key={hermana.mesa_id} className={`text-body-md ${s.grupoItem}`}>
                                        <Link to={`/mozo/mesas/${hermana.mesa_id}`} className={s.grupoLink}>
                                            Mesa #{String(hermana.mesa_id).padStart(2, '0')}
                                            <i className='bi bi-box-arrow-in-right ms-1' aria-hidden='true' />
                                        </Link>
                                        <span className={s.badgeEstado}>
                                            {hermana.pedido_estado
                                                ? hermana.pedido_estado.replace(/_/g, ' ')
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
                                Cuentas del grupo {mesa?.grupo_codigo ? `#${mesa.grupo_codigo}` : ''}
                            </h3>
                            {cuenta.grupo.map(hermana => (
                                <div key={hermana.mesa_id} className='d-flex flex-column gap-3'>
                                    <div className={s.grupoHeader}>
                                        <Link to={`/mozo/mesas/${hermana.mesa_id}`} className='text-headline-sm'>
                                            Mesa #{String(hermana.mesa_id).padStart(2, '0')}
                                        </Link>
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
                Se muestra la visita actual de la mesa. Al confirmar todos los pedidos del grupo
                se cierra la sesión y la mesa queda libre.
            </p>
        </div>
    )
}
