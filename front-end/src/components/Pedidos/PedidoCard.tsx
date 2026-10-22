import { useState } from 'react'
import { Alert, Button, Spinner } from 'react-bootstrap'
import type { EstadoPedido, PedidoResumen } from '../../types/Mesa'
import { cambiarEstadoPedido, confirmarPedido, enviarPedido } from '../../api/pedidos'
import s from './PedidoCard.module.css'

// Tarjeta de un pedido activo de la mesa con las acciones del mozo.
// Matriz de transiciones espejo de PedidoService::cambiarEstado():
//   en_curso → (confirmar) → confirmado → (enviar) → enviado →
//   en_preparacion → entregado → cerrado; cancelado desde cualquiera
//   no final; confirmado → en_curso deshace la confirmación.

const ETIQUETAS_ESTADO: Record<EstadoPedido, string> = {
    en_curso: 'En curso',
    confirmado: 'Confirmado',
    enviado: 'Enviado',
    en_preparacion: 'En preparación',
    entregado: 'Entregado',
    cerrado: 'Cerrado',
    cancelado: 'Cancelado',
}

const CLASES_ESTADO: Record<EstadoPedido, string> = {
    en_curso: 'badgeEnCurso',
    confirmado: 'badgeConfirmado',
    enviado: 'badgeEnviado',
    en_preparacion: 'badgePreparacion',
    entregado: 'badgeEntregado',
    cerrado: 'badgeCerrado',
    cancelado: 'badgeCancelado',
}

const formatearPrecio = (precio: number): string =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(precio)

// No se exporta: react-refresh/only-export-components.
function AuxiliarLinea({ descuento, promocion }: { descuento: number; promocion: { nombre: string } | null }) {
    if (!promocion && descuento <= 0) return null
    return (
        <span className={`text-body-sm ${s.lineaAux}`}>
            {promocion && <span className={s.promoTag}>{promocion.nombre}</span>}
            {descuento > 0 && <span className={s.descuento}>− {formatearPrecio(descuento)}</span>}
        </span>
    )
}

// No se exporta: react-refresh/only-export-components.
function BotonAccion({
    etiqueta, icono, variant, ocupado, deshabilitado, onClick,
}: {
    etiqueta: string
    icono: string
    variant: string
    ocupado: boolean
    deshabilitado?: boolean
    onClick: () => void
}) {
    return (
        <Button
            size='sm'
            variant={variant}
            className='text-label-md'
            type='button'
            disabled={ocupado || deshabilitado}
            onClick={onClick}
        >
            {ocupado
                ? <><Spinner size='sm' animation='border' className='me-1' />{etiqueta}...</>
                : <><i className={`bi ${icono} me-1`} aria-hidden='true' />{etiqueta}</>}
        </Button>
    )
}

type Accion = 'confirmar' | 'forzar' | 'enviar' | 'reabrir' | 'cancelar'
    | 'preparacion' | 'entregado' | 'cerrar'

interface PedidoCardProps {
    pedido: PedidoResumen
    // Refetch del resumen de la mesa tras cualquier acción exitosa.
    onCambio: () => void
    // "Agregar líneas" (habilitado solo para pedidos en curso).
    onAgregar?: () => void
}

export function PedidoCard({ pedido, onCambio, onAgregar }: PedidoCardProps) {
    const [accion, setAccion] = useState<Accion | null>(null)
    const [errorApi, setErrorApi] = useState<string | null>(null)
    const [exito, setExito] = useState<string | null>(null)
    // El gate de confirmar (422 "Faltan comensales…") ofrece forzar.
    const [permiteForzar, setPermiteForzar] = useState(false)

    const estado = (ETIQUETAS_ESTADO[pedido.estado as EstadoPedido] ? pedido.estado : 'en_curso') as EstadoPedido

    async function correr(tipo: Accion, tarea: () => Promise<{ mensaje: string }>) {
        setAccion(tipo)
        setErrorApi(null)
        setExito(null)
        try {
            const { mensaje } = await tarea()
            setExito(mensaje)
            setPermiteForzar(false)
            onCambio()
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'No se pudo completar la operación'
            setErrorApi(msg)
            setPermiteForzar(msg.includes('forzar'))
        } finally {
            setAccion(null)
        }
    }

    const ocupado = accion !== null

    return (
        <article className={s.card}>
            <div className={s.header}>
                <span className={`text-headline-sm ${s.titulo}`}>Pedido #{pedido.id}</span>
                <span className={`text-label-sm ${s[CLASES_ESTADO[estado]]}`}>
                    {ETIQUETAS_ESTADO[estado]}
                </span>
                {(estado === 'en_curso' || estado === 'confirmado') && (
                    <span className={`text-label-sm ${pedido.todas_confirmadas ? s.badgeOk : s.badgePendiente}`}>
                        {pedido.todas_confirmadas ? 'Todas confirmadas' : 'Faltan confirmar'}
                    </span>
                )}
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

            <div className={s.total}>
                <span className='text-label-md'>Total del pedido</span>
                <span className='text-price-display'>{formatearPrecio(pedido.total)}</span>
            </div>

            {errorApi && <Alert variant='danger' className={`text-body-sm ${s.mensaje}`}>{errorApi}</Alert>}
            {exito && <Alert variant='success' className={`text-body-sm ${s.mensaje}`}>{exito}</Alert>}

            {permiteForzar && (
                <Button
                    size='sm'
                    variant='warning'
                    className={`text-label-md ${s.botonForzar}`}
                    type='button'
                    disabled={ocupado}
                    onClick={() => correr('forzar', () => confirmarPedido(pedido.id, true))}
                >
                    <i className='bi bi-exclamation-triangle me-1' aria-hidden='true' />
                    Forzar confirmación y enviar igual
                </Button>
            )}

            <div className={s.acciones}>
                {estado === 'en_curso' && (
                    <>
                        <BotonAccion
                            etiqueta='Confirmar' icono='bi-check2-circle' variant='primary'
                            ocupado={accion === 'confirmar'}
                            onClick={() => correr('confirmar', () => confirmarPedido(pedido.id))}
                        />
                        {onAgregar && (
                            <BotonAccion
                                etiqueta='Agregar líneas' icono='bi-plus-lg' variant='outline-primary'
                                ocupado={false}
                                onClick={onAgregar}
                            />
                        )}
                        <BotonAccion
                            etiqueta='Cancelar' icono='bi-x-circle' variant='outline-danger'
                            ocupado={accion === 'cancelar'}
                            onClick={() => correr('cancelar', () => cambiarEstadoPedido(pedido.id, 'cancelado'))}
                        />
                    </>
                )}

                {estado === 'confirmado' && (
                    <>
                        <BotonAccion
                            etiqueta='Enviar a cocina' icono='bi-send' variant='primary'
                            ocupado={accion === 'enviar'}
                            onClick={() => correr('enviar', () => enviarPedido(pedido.id))}
                        />
                        <BotonAccion
                            etiqueta='Reabrir' icono='bi-arrow-counterclockwise' variant='outline-secondary'
                            ocupado={accion === 'reabrir'}
                            onClick={() => correr('reabrir', () => cambiarEstadoPedido(pedido.id, 'en_curso'))}
                        />
                        <BotonAccion
                            etiqueta='Cancelar' icono='bi-x-circle' variant='outline-danger'
                            ocupado={accion === 'cancelar'}
                            onClick={() => correr('cancelar', () => cambiarEstadoPedido(pedido.id, 'cancelado'))}
                        />
                    </>
                )}

                {estado === 'enviado' && (
                    <>
                        <BotonAccion
                            etiqueta='Pasar a preparación' icono='bi-fire' variant='outline-primary'
                            ocupado={accion === 'preparacion'}
                            onClick={() => correr('preparacion', () => cambiarEstadoPedido(pedido.id, 'en_preparacion'))}
                        />
                        <BotonAccion
                            etiqueta='Cancelar' icono='bi-x-circle' variant='outline-danger'
                            ocupado={accion === 'cancelar'}
                            onClick={() => correr('cancelar', () => cambiarEstadoPedido(pedido.id, 'cancelado'))}
                        />
                    </>
                )}

                {estado === 'en_preparacion' && (
                    <>
                        <BotonAccion
                            etiqueta='Marcar entregado' icono='bi-bag-check' variant='outline-primary'
                            ocupado={accion === 'entregado'}
                            onClick={() => correr('entregado', () => cambiarEstadoPedido(pedido.id, 'entregado'))}
                        />
                        <BotonAccion
                            etiqueta='Cancelar' icono='bi-x-circle' variant='outline-danger'
                            ocupado={accion === 'cancelar'}
                            onClick={() => correr('cancelar', () => cambiarEstadoPedido(pedido.id, 'cancelado'))}
                        />
                    </>
                )}

                {estado === 'entregado' && (
                    <>
                        <BotonAccion
                            etiqueta='Cerrar pedido' icono='bi-check2-square' variant='primary'
                            ocupado={accion === 'cerrar'}
                            onClick={() => correr('cerrar', () => cambiarEstadoPedido(pedido.id, 'cerrado'))}
                        />
                        <BotonAccion
                            etiqueta='Cancelar' icono='bi-x-circle' variant='outline-danger'
                            ocupado={accion === 'cancelar'}
                            onClick={() => correr('cancelar', () => cambiarEstadoPedido(pedido.id, 'cancelado'))}
                        />
                    </>
                )}
            </div>
        </article>
    )
}
